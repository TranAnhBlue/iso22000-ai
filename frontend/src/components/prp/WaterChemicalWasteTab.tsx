import React, { useState, useEffect, useMemo } from "react";
import {
  Droplets,
  FlaskConical,
  Trash2,
  Plus,
  Printer,
  FileDown,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Building,
  Calendar,
  Clock,
  User,
  ExternalLink,
  Sliders,
  Check,
  X,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { printHtml } from "@/lib/print";
import { EmptyState } from "@/components/EmptyState";

// ==================== INTERFACES ====================
export interface WaterSafetyRecord {
  record_id: string;
  record_code: string;
  sampling_point: string;
  sampling_date: string;
  sampling_time: string;
  ph_level: number;
  chlorine_ppm: number;
  turbidity_ntu: number;
  sensory_result: string;
  coliform_cfu: number;
  e_coli_cfu: number;
  overall_status: string; // PASS, FAIL
  tested_by_name: string;
  verified_by_name?: string;
  corrective_action?: string;
  notes?: string;
  created_at?: string;
}

export interface WaterLimitProfile {
  profile_id: string;
  profile_code: string;
  profile_name: string;
  standard_reference: string;
  ph_min: number;
  ph_max: number;
  chlorine_min_ppm: number;
  chlorine_max_ppm: number;
  turbidity_max_ntu: number;
  coliform_max_cfu: number;
  e_coli_max_cfu: number;
  status: string; // ACTIVE, RETIRED
}

export interface ChemicalRecord {
  chemical_id: string;
  chemical_code: string;
  chemical_name: string;
  purpose: string;
  is_food_grade: boolean;
  supplier_name: string;
  msds_document_url?: string;
  msds_file_name?: string;
  msds_expiry_date?: string;
  dilution_ratio: string;
  storage_location: string;
  approval_status: string; // APPROVED, CONDITIONAL, EXPIRED
  current_stock_kg: number;
  safety_instructions?: string;
  approved_by?: string;
  created_at?: string;
}

export interface WasteLog {
  waste_id: string;
  log_code: string;
  log_date: string;
  waste_type: string;
  description: string;
  quantity_kg: number;
  storage_area: string;
  disposal_contractor: string;
  transfer_note_code?: string;
  status: string; // STORED, TRANSFERRED, DISPOSED
  handled_by_name: string;
  notes?: string;
  created_at?: string;
}

// ==================== COMPONENT ====================
export function WaterChemicalWasteTab() {
  const [subTab, setSubTab] = useState<"water" | "chemicals" | "waste">("water");
  const [loading, setLoading] = useState(false);

  // Data states
  const [waterLogs, setWaterLogs] = useState<WaterSafetyRecord[]>([]);
  const [activeWaterLimit, setActiveWaterLimit] = useState<WaterLimitProfile | null>(null);
  const [chemicals, setChemicals] = useState<ChemicalRecord[]>([]);
  const [wasteLogs, setWasteLogs] = useState<WasteLog[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals
  const [showWaterModal, setShowWaterModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showChemicalModal, setShowChemicalModal] = useState(false);
  const [showWasteModal, setShowWasteModal] = useState(false);

  // Forms
  const [waterForm, setWaterForm] = useState({
    sampling_point: "Bồn nước ngầm cấp nước sơ chế (Điểm 1)",
    sampling_date: new Date().toISOString().split("T")[0],
    sampling_time: "07:30",
    ph_level: 7.2,
    chlorine_ppm: 0.45,
    turbidity_ntu: 0.6,
    sensory_result: "Trong suốt, không màu, không mùi vị lạ",
    coliform_cfu: 0.0,
    e_coli_cfu: 0.0,
    overall_status: "PASS",
    tested_by_name: "Kỹ thuật Cơ điện An Giang",
    verified_by_name: "Trưởng ban ATTP",
    corrective_action: "",
    notes: "",
  });

  const [limitForm, setLimitForm] = useState({
    profile_code: "WLP-QCVN01-1-2026",
    profile_name: "Tiêu chuẩn nước ăn uống & chế biến thực phẩm QCVN 01-1:2018/BYT",
    standard_reference: "QCVN 01-1:2018/BYT",
    ph_min: 6.5,
    ph_max: 8.5,
    chlorine_min_ppm: 0.3,
    chlorine_max_ppm: 1.0,
    turbidity_max_ntu: 2.0,
    coliform_max_cfu: 0.0,
    e_coli_max_cfu: 0.0,
    status: "ACTIVE",
  });

  const [chemicalForm, setChemicalForm] = useState({
    chemical_code: "",
    chemical_name: "",
    purpose: "",
    is_food_grade: true,
    supplier_name: "",
    dilution_ratio: "1:1000 (200 ppm Clo hoạt tính)",
    storage_location: "Kho hóa chất riêng biệt có khóa, thoáng khí",
    approval_status: "APPROVED",
    current_stock_kg: 50.0,
    safety_instructions:
      "Mang găng tay cao su, kính bảo hộ và khẩu trang than hoạt tính khi pha chế",
    approved_by: "Trưởng ban ATTP / QA",
  });

  const [wasteForm, setWasteForm] = useState({
    waste_type: "ORGANIC_BYPRODUCT",
    description: "Phụ phẩm cá tra: xương, đầu, da cá sau khi lạng fillet",
    quantity_kg: 350.0,
    storage_area: "Nhà chứa phụ phẩm lạnh khép kín riêng biệt",
    disposal_contractor: "Nhà máy Sản xuất Thức ăn Chăn nuôi & Bột cá An Giang",
    status: "TRANSFERRED",
    handled_by_name: "Tổ Vệ sinh Môi trường",
    notes: "Xe bồn chuyên dụng kín, xịt rửa khử trùng khu vực sau khi bốc dỡ",
  });

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [wLogsRes, wLimitRes, chemRes, wasteRes] = await Promise.allSettled([
        api.get("/haccp/water-logs"),
        api.get("/haccp/water-limit-profiles/active"),
        api.get("/haccp/chemicals"),
        api.get("/haccp/waste-logs"),
      ]);

      if (wLogsRes.status === "fulfilled") setWaterLogs(wLogsRes.value.data || []);
      if (wLimitRes.status === "fulfilled") setActiveWaterLimit(wLimitRes.value.data || null);
      if (chemRes.status === "fulfilled") setChemicals(chemRes.value.data || []);
      if (wasteRes.status === "fulfilled") setWasteLogs(wasteRes.value.data || []);
    } catch (err: any) {
      console.error(err);
      toast.error(
        "Không thể tải dữ liệu Môi trường & Hóa chất: " +
          (err.response?.data?.detail || err.message),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered lists
  const filteredWaterLogs = useMemo(() => {
    return waterLogs.filter((item) => {
      const matchQ =
        !searchQuery ||
        item.record_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sampling_point.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tested_by_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "ALL" || item.overall_status === statusFilter;
      return matchQ && matchStatus;
    });
  }, [waterLogs, searchQuery, statusFilter]);

  const filteredChemicals = useMemo(() => {
    return chemicals.filter((item) => {
      const matchQ =
        !searchQuery ||
        item.chemical_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.chemical_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.purpose.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "ALL" || item.approval_status === statusFilter;
      return matchQ && matchStatus;
    });
  }, [chemicals, searchQuery, statusFilter]);

  const filteredWasteLogs = useMemo(() => {
    return wasteLogs.filter((item) => {
      const matchQ =
        !searchQuery ||
        item.log_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.disposal_contractor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.handled_by_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "ALL" || item.status === statusFilter;
      return matchQ && matchStatus;
    });
  }, [wasteLogs, searchQuery, statusFilter]);

  // Actions: Ensure Active Water Limit Profile
  const handleSaveLimitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/haccp/water-limit-profiles", limitForm);
      toast.success("Đã phê duyệt và kích hoạt bộ ngưỡng nước QCVN 01-1:2018/BYT");
      setShowLimitModal(false);
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi lưu bộ ngưỡng: " + (err.response?.data?.detail || err.message));
    }
  };

  // Actions: Water Log
  const handleCreateWaterLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWaterLimit) {
      toast.error(
        "Chưa có bộ ngưỡng nước ACTIVE. Vui lòng kích hoạt bộ ngưỡng trước khi lập phiếu!",
      );
      setShowLimitModal(true);
      return;
    }
    try {
      await api.post("/haccp/water-logs", waterForm);
      toast.success("Đã tạo phiếu kiểm tra nguồn nước thành công");
      setShowWaterModal(false);
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi tạo phiếu kiểm nước: " + (err.response?.data?.detail || err.message));
    }
  };

  // Actions: Chemical
  const handleCreateChemical = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/haccp/chemicals", chemicalForm);
      toast.success("Đã bổ sung hóa chất vào danh mục phê duyệt");
      setShowChemicalModal(false);
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi thêm hóa chất: " + (err.response?.data?.detail || err.message));
    }
  };

  // Actions: Waste
  const handleCreateWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/haccp/waste-logs", wasteForm);
      toast.success("Đã ghi nhật ký thu gom xử lý rác thải thành công");
      setShowWasteModal(false);
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi ghi nhật ký rác thải: " + (err.response?.data?.detail || err.message));
    }
  };

  // Print: Water Logs (BM01-SSOP-NUOC)
  const handlePrintWater = () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>SỔ KIỂM TRA CHẤT LƯỢNG NGUỒN NƯỚC SẢN XUẤT - QCVN 01-1:2018/BYT</title>
        <style>
          body { font-family: 'Times New Roman', serif; margin: 20px; font-size: 13px; color: #111; }
          .header-tbl { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .header-tbl td { border: 1px solid #333; padding: 8px; vertical-align: middle; }
          .title { font-size: 16px; font-weight: bold; text-transform: uppercase; text-align: center; }
          .data-tbl { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          .data-tbl th, .data-tbl td { border: 1px solid #333; padding: 6px; text-align: left; }
          .data-tbl th { background-color: #f1f5f9; text-align: center; font-weight: bold; }
          .text-center { text-align: center; }
          .sig-tbl { width: 100%; border: none; margin-top: 30px; }
          .sig-tbl td { text-align: center; width: 50%; border: none; }
        </style>
      </head>
      <body>
        <table class="header-tbl">
          <tr>
            <td style="width: 25%; text-align: center;">
              <strong>CÔNG TY THỰC PHẨM AN GIANG</strong><br/>
              <span style="font-size: 11px;">HỆ THỐNG FSMS ISO 22000:2018</span>
            </td>
            <td style="width: 50%;">
              <div class="title">NHẬT KÝ KIỂM TRA CHẤT LƯỢNG NƯỚC & ĐÁ SẢN XUẤT</div>
              <div style="text-align: center; font-style: italic; font-size: 11px;">(Áp dụng theo QCVN 01-1:2018/BYT & Quy phạm SSOP An toàn nguồn nước)</div>
            </td>
            <td style="width: 25%; font-size: 11px;">
              <strong>Mã biểu mẫu:</strong> BM01-SSOP-NUOC<br/>
              <strong>Lần ban hành:</strong> 02<br/>
              <strong>Ngày in:</strong> ${new Date().toLocaleDateString("vi-VN")}
            </td>
          </tr>
        </table>

        <div style="margin-bottom: 15px; font-size: 12px;">
          <strong>Bộ quy chuẩn kiểm soát áp dụng:</strong> ${activeWaterLimit ? activeWaterLimit.profile_name : "QCVN 01-1:2018/BYT"} |
          <strong>Ngưỡng pH:</strong> ${activeWaterLimit ? `${activeWaterLimit.ph_min} - ${activeWaterLimit.ph_max}` : "6.5 - 8.5"} |
          <strong>Ngưỡng Clo dư:</strong> ${activeWaterLimit ? `${activeWaterLimit.chlorine_min_ppm} - ${activeWaterLimit.chlorine_max_ppm} mg/L` : "0.3 - 1.0 mg/L"}
        </div>

        <table class="data-tbl">
          <thead>
            <tr>
              <th style="width: 35px;">STT</th>
              <th>Mã phiếu</th>
              <th>Vị trí lấy mẫu</th>
              <th>Ngày & Giờ</th>
              <th>Độ pH</th>
              <th>Clo dư (mg/L)</th>
              <th>Độ đục (NTU)</th>
              <th>Cảm quan</th>
              <th>Kết quả</th>
              <th>Người kiểm tra</th>
            </tr>
          </thead>
          <tbody>
            ${waterLogs
              .map(
                (w, idx) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td style="font-family: monospace; font-weight: bold;">${w.record_code}</td>
                <td>${w.sampling_point}</td>
                <td class="text-center">${w.sampling_date} ${w.sampling_time}</td>
                <td class="text-center font-bold">${w.ph_level}</td>
                <td class="text-center font-bold">${w.chlorine_ppm}</td>
                <td class="text-center">${w.turbidity_ntu}</td>
                <td>${w.sensory_result}</td>
                <td class="text-center font-bold" style="color: ${w.overall_status === "PASS" ? "green" : "red"};">
                  ${w.overall_status === "PASS" ? "ĐẠT" : "K.ĐẠT"}
                </td>
                <td>${w.tested_by_name}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <table class="sig-tbl">
          <tr>
            <td>
              <strong>KỸ THUẬT VẬN HÀNH TRẠM NƯỚC</strong><br/>
              <i>(Ký và ghi rõ họ tên)</i><br/><br/><br/><br/>
              <strong>Kỹ thuật Cơ điện</strong>
            </td>
            <td>
              <strong>TRƯỞNG BAN ATTP / QUẢN ĐỐC XƯỞNG</strong><br/>
              <i>(Ký duyệt xác nhận)</i><br/><br/><br/><br/>
              <strong>Nguyễn Văn An</strong>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    printHtml(html);
  };

  // Print: Chemical List (BM01-SSOP-HOACHAT)
  const handlePrintChemicals = () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>DANH MỤC HÓA CHẤT ĐƯỢC PHÊ DUYỆT SỬ DỤNG - ISO 22000</title>
        <style>
          body { font-family: 'Times New Roman', serif; margin: 20px; font-size: 13px; color: #111; }
          .header-tbl { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .header-tbl td { border: 1px solid #333; padding: 8px; vertical-align: middle; }
          .title { font-size: 16px; font-weight: bold; text-transform: uppercase; text-align: center; }
          .data-tbl { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          .data-tbl th, .data-tbl td { border: 1px solid #333; padding: 6px; text-align: left; }
          .data-tbl th { background-color: #f1f5f9; text-align: center; font-weight: bold; }
          .text-center { text-align: center; }
          .sig-tbl { width: 100%; border: none; margin-top: 30px; }
          .sig-tbl td { text-align: center; width: 50%; border: none; }
        </style>
      </head>
      <body>
        <table class="header-tbl">
          <tr>
            <td style="width: 25%; text-align: center;">
              <strong>CÔNG TY THỰC PHẨM AN GIANG</strong><br/>
              <span style="font-size: 11px;">HỆ THỐNG FSMS ISO 22000:2018</span>
            </td>
            <td style="width: 50%;">
              <div class="title">DANH MỤC HÓA CHẤT ĐƯỢC PHÊ DUYỆT SỬ DỤNG</div>
              <div style="text-align: center; font-style: italic; font-size: 11px;">(Kèm theo Quy phạm SSOP Kiểm soát hóa chất tẩy rửa & khử trùng)</div>
            </td>
            <td style="width: 25%; font-size: 11px;">
              <strong>Mã biểu mẫu:</strong> BM01-SSOP-HOACHAT<br/>
              <strong>Lần ban hành:</strong> 01<br/>
              <strong>Ngày in:</strong> ${new Date().toLocaleDateString("vi-VN")}
            </td>
          </tr>
        </table>

        <table class="data-tbl">
          <thead>
            <tr>
              <th style="width: 35px;">STT</th>
              <th>Mã số</th>
              <th>Tên hóa chất</th>
              <th>Mục đích sử dụng</th>
              <th>Food-Grade</th>
              <th>Nhà cung cấp</th>
              <th>Tỷ lệ pha loãng</th>
              <th>Nơi lưu trữ</th>
              <th>Tồn kho (kg/L)</th>
              <th>Tình trạng</th>
            </tr>
          </thead>
          <tbody>
            ${chemicals
              .map(
                (c, idx) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td style="font-family: monospace; font-weight: bold;">${c.chemical_code}</td>
                <td><strong>${c.chemical_name}</strong></td>
                <td>${c.purpose}</td>
                <td class="text-center">${c.is_food_grade ? "CÓ" : "KHÔNG"}</td>
                <td>${c.supplier_name}</td>
                <td>${c.dilution_ratio}</td>
                <td>${c.storage_location}</td>
                <td class="text-center font-bold">${c.current_stock_kg}</td>
                <td class="text-center font-bold" style="color: ${c.approval_status === "APPROVED" ? "green" : "orange"};">
                  ${c.approval_status === "APPROVED" ? "ĐƯỢC DUYỆT" : c.approval_status}
                </td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <table class="sig-tbl">
          <tr>
            <td>
              <strong>NGƯỜI LẬP DANH MỤC</strong><br/>
              <i>(Ký và ghi rõ họ tên)</i><br/><br/><br/><br/>
              <strong>Tổ trưởng Tổ Vệ sinh</strong>
            </td>
            <td>
              <strong>ĐỘI TRƯỞNG ĐỘI ATTP DUYỆT</strong><br/>
              <i>(Ký và ghi rõ họ tên)</i><br/><br/><br/><br/>
              <strong>Nguyễn Văn An</strong>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    printHtml(html);
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-cyan-900 via-sky-900 to-blue-950 text-white rounded-2xl p-6 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-cyan-300 shadow-inner">
            <Droplets className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider bg-cyan-400/20 text-cyan-300 px-2.5 py-0.5 rounded-full border border-cyan-400/30">
                SSOP ISO 22000:2018
              </span>
              <span className="text-[11px] font-bold text-slate-300">
                QCVN 01-1:2018/BYT & Hồ sơ An Giang
              </span>
            </div>
            <h2 className="text-xl font-black text-white mt-1">
              Kiểm Soát Nguồn Nước, Hóa Chất & Môi Trường
            </h2>
            <p className="text-xs text-cyan-100/90 mt-1 max-w-2xl leading-relaxed">
              Quản lý toàn diện quy chuẩn an toàn nguồn nước chế biến, danh mục hóa chất tẩy rửa CIP
              được duyệt kèm phiếu an toàn MSDS, và nhật ký thu gom xử lý rác thải / phụ phẩm khép
              kín.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {subTab === "water" && (
            <>
              <button
                onClick={() => setShowLimitModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-cyan-200 border border-white/20 transition-all shadow-sm"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Cấu Hình Ngưỡng QCVN</span>
              </button>
              <button
                onClick={handlePrintWater}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all shadow-sm"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Xuất PDF Sổ Nước (BM01)</span>
              </button>
              <button
                onClick={() => setShowWaterModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-md font-black"
              >
                <Plus className="w-4 h-4" />
                <span>+ Lập Phiếu Kiểm Nước</span>
              </button>
            </>
          )}

          {subTab === "chemicals" && (
            <>
              <button
                onClick={handlePrintChemicals}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all shadow-sm"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Xuất PDF Danh Mục Hóa Chất</span>
              </button>
              <button
                onClick={() => setShowChemicalModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-md font-black"
              >
                <Plus className="w-4 h-4" />
                <span>+ Bổ Sung Hóa Chất</span>
              </button>
            </>
          )}

          {subTab === "waste" && (
            <button
              onClick={() => setShowWasteModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-md font-black"
            >
              <Plus className="w-4 h-4" />
              <span>+ Ghi Nhật Ký Rác Thải</span>
            </button>
          )}
        </div>
      </div>

      {/* SUB-TABS SEGMENTED CONTROL */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit">
        <button
          onClick={() => {
            setSubTab("water");
            setSearchQuery("");
            setStatusFilter("ALL");
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            subTab === "water"
              ? "bg-white dark:bg-slate-800 text-cyan-800 dark:text-cyan-400 shadow-sm border border-slate-200 dark:border-slate-700 font-black"
              : "text-slate-700 dark:text-slate-300 hover:text-slate-900 hover:bg-white/60 dark:hover:bg-slate-800/60"
          }`}
        >
          <Droplets className="w-4 h-4 text-cyan-600" />
          <span>1. Nguồn Nước & Đá Sản Xuất (QCVN 01-1)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-100 text-cyan-800 font-bold dark:bg-cyan-950 dark:text-cyan-300">
            {waterLogs.length}
          </span>
        </button>

        <button
          onClick={() => {
            setSubTab("chemicals");
            setSearchQuery("");
            setStatusFilter("ALL");
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            subTab === "chemicals"
              ? "bg-white dark:bg-slate-800 text-cyan-800 dark:text-cyan-400 shadow-sm border border-slate-200 dark:border-slate-700 font-black"
              : "text-slate-700 dark:text-slate-300 hover:text-slate-900 hover:bg-white/60 dark:hover:bg-slate-800/60"
          }`}
        >
          <FlaskConical className="w-4 h-4 text-cyan-600" />
          <span>2. Danh Mục Hóa Chất & MSDS (BM01)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-100 text-cyan-800 font-bold dark:bg-cyan-950 dark:text-cyan-300">
            {chemicals.length}
          </span>
        </button>

        <button
          onClick={() => {
            setSubTab("waste");
            setSearchQuery("");
            setStatusFilter("ALL");
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            subTab === "waste"
              ? "bg-white dark:bg-slate-800 text-cyan-800 dark:text-cyan-400 shadow-sm border border-slate-200 dark:border-slate-700 font-black"
              : "text-slate-700 dark:text-slate-300 hover:text-slate-900 hover:bg-white/60 dark:hover:bg-slate-800/60"
          }`}
        >
          <Trash2 className="w-4 h-4 text-cyan-600" />
          <span>3. Nhật Ký Thu Gom Rác Thải (BM01)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-100 text-cyan-800 font-bold dark:bg-cyan-950 dark:text-cyan-300">
            {wasteLogs.length}
          </span>
        </button>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                subTab === "water"
                  ? "Tìm kiếm mã phiếu, điểm lấy mẫu, người đo..."
                  : subTab === "chemicals"
                    ? "Tìm tên hóa chất, mã, nhà cung cấp, công dụng..."
                    : "Tìm mã rác, loại rác thải, đơn vị xử lý..."
              }
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-bold">Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="ALL">Tất cả trạng thái</option>
              {subTab === "water" ? (
                <>
                  <option value="PASS">✓ ĐẠT chuẩn QCVN</option>
                  <option value="FAIL">✕ KHÔNG ĐẠT</option>
                </>
              ) : subTab === "chemicals" ? (
                <>
                  <option value="APPROVED">✓ ĐÃ PHÊ DUYỆT</option>
                  <option value="CONDITIONAL">Có điều kiện</option>
                  <option value="EXPIRED">Hết hạn</option>
                </>
              ) : (
                <>
                  <option value="TRANSFERRED">Đã bàn giao</option>
                  <option value="STORED">Đang lưu kho tạm</option>
                  <option value="DISPOSED">Đã tiêu hủy</option>
                </>
              )}
            </select>
          </div>
        </div>

        {subTab === "water" && activeWaterLimit && (
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-800 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-3.5 py-2 rounded-xl border border-cyan-200/80 dark:border-cyan-800/60">
            <ShieldCheck className="w-4 h-4 shrink-0 text-cyan-600" />
            <span>
              Ngưỡng ACTIVE: pH ({activeWaterLimit.ph_min} - {activeWaterLimit.ph_max}) | Clo (
              {activeWaterLimit.chlorine_min_ppm} - {activeWaterLimit.chlorine_max_ppm} mg/L)
            </span>
          </div>
        )}
      </div>

      {/* ==================== SUB-TAB 1: WATER SAFETY LOGS ==================== */}
      {subTab === "water" && (
        <div className="space-y-4">
          {waterLogs.length === 0 ? (
            <EmptyState
              icon={Droplets}
              title="Chưa có nhật ký kiểm tra nguồn nước nào"
              description="Thực hiện đo đạc hàng ca các chỉ tiêu pH, Clo dư, độ đục và vi sinh vật theo QCVN 01-1:2018/BYT để đảm bảo an toàn tuyệt đối cho thực phẩm."
              actionLabel="+ Lập Phiếu Kiểm Nước Đầu Tiên"
              onAction={() => setShowWaterModal(true)}
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3.5">Mã Phiếu & Điểm Lấy Mẫu</th>
                      <th className="p-3.5">Thời Gian Lấy Mẫu</th>
                      <th className="p-3.5 text-center">Độ pH</th>
                      <th className="p-3.5 text-center">Clo Dư (mg/L)</th>
                      <th className="p-3.5 text-center">Độ Đục (NTU)</th>
                      <th className="p-3.5">Cảm Quan</th>
                      <th className="p-3.5 text-center">Vi Sinh (Coli/E.coli)</th>
                      <th className="p-3.5 text-center">Kết Quả</th>
                      <th className="p-3.5">Người Kiểm Tra</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredWaterLogs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400">
                          Không tìm thấy phiếu kiểm tra nước nào phù hợp điều kiện lọc.
                        </td>
                      </tr>
                    ) : (
                      filteredWaterLogs.map((log) => (
                        <tr
                          key={log.record_id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="p-3.5">
                            <div className="font-mono font-bold text-slate-900 dark:text-white">
                              {log.record_code}
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold mt-0.5">
                              {log.sampling_point}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {log.sampling_date}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {log.sampling_time}
                            </div>
                          </td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-lg font-bold font-mono ${
                                log.ph_level >= 6.5 && log.ph_level <= 8.5
                                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : "bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                              }`}
                            >
                              {log.ph_level}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-lg font-bold font-mono ${
                                log.chlorine_ppm >= 0.3 && log.chlorine_ppm <= 1.0
                                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : "bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                              }`}
                            >
                              {log.chlorine_ppm} mg/L
                            </span>
                          </td>
                          <td className="p-3.5 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                            {log.turbidity_ntu} NTU
                          </td>
                          <td className="p-3.5 max-w-[200px]">
                            <p
                              className="truncate text-slate-700 dark:text-slate-300"
                              title={log.sensory_result}
                            >
                              {log.sensory_result}
                            </p>
                          </td>
                          <td className="p-3.5 text-center font-mono text-[11px]">
                            {log.coliform_cfu} / {log.e_coli_cfu} CFU
                          </td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black ${
                                log.overall_status === "PASS"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              }`}
                            >
                              {log.overall_status === "PASS" ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>ĐẠT QCVN</span>
                                </>
                              ) : (
                                <>
                                  <X className="w-3.5 h-3.5" />
                                  <span>K.ĐẠT</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {log.tested_by_name}
                            </div>
                            {log.verified_by_name && (
                              <div className="text-[10px] text-slate-500">
                                Duyệt: {log.verified_by_name}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== SUB-TAB 2: APPROVED CHEMICALS ==================== */}
      {subTab === "chemicals" && (
        <div className="space-y-4">
          {chemicals.length === 0 ? (
            <EmptyState
              icon={FlaskConical}
              title="Chưa có hóa chất nào trong danh mục phê duyệt"
              description="Lập danh mục các hóa chất tẩy rửa CIP, khử trùng và phụ gia an toàn được phép sử dụng trong khuôn viên nhà máy thực phẩm."
              actionLabel="+ Thêm Hóa Chất Mới"
              onAction={() => setShowChemicalModal(true)}
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3.5">Mã & Tên Hóa Chất</th>
                      <th className="p-3.5">Mục Đích Sử Dụng</th>
                      <th className="p-3.5 text-center">Tiêu Chuẩn Thực Phẩm</th>
                      <th className="p-3.5">Nhà Cung Cấp</th>
                      <th className="p-3.5">Tỷ Lệ Pha Loãng</th>
                      <th className="p-3.5">Vị Trí Lưu Kho</th>
                      <th className="p-3.5 text-center">Tồn Kho</th>
                      <th className="p-3.5 text-center">Phê Duyệt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredChemicals.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          Không tìm thấy hóa chất nào phù hợp điều kiện lọc.
                        </td>
                      </tr>
                    ) : (
                      filteredChemicals.map((chem) => (
                        <tr
                          key={chem.chemical_id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="p-3.5">
                            <div className="font-mono font-bold text-slate-900 dark:text-white">
                              {chem.chemical_code}
                            </div>
                            <div className="text-xs text-cyan-800 dark:text-cyan-400 font-bold mt-0.5">
                              {chem.chemical_name}
                            </div>
                          </td>
                          <td className="p-3.5 max-w-[220px]">
                            <p className="text-slate-700 dark:text-slate-300 font-medium">
                              {chem.purpose}
                            </p>
                          </td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                chem.is_food_grade
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              }`}
                            >
                              {chem.is_food_grade ? "Food-Grade" : "Non Food-Grade"}
                            </span>
                          </td>
                          <td className="p-3.5 font-medium text-slate-800 dark:text-slate-200">
                            {chem.supplier_name}
                          </td>
                          <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                            {chem.dilution_ratio}
                          </td>
                          <td className="p-3.5 text-slate-600 dark:text-slate-400 font-medium">
                            {chem.storage_location}
                          </td>
                          <td className="p-3.5 text-center font-bold font-mono text-slate-900 dark:text-white">
                            {chem.current_stock_kg} kg
                          </td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                                chem.approval_status === "APPROVED"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              }`}
                            >
                              {chem.approval_status === "APPROVED"
                                ? "ĐÃ DUYỆT"
                                : chem.approval_status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== SUB-TAB 3: WASTE LOGS ==================== */}
      {subTab === "waste" && (
        <div className="space-y-4">
          {wasteLogs.length === 0 ? (
            <EmptyState
              icon={Trash2}
              title="Chưa có nhật ký thu gom xử lý rác thải nào"
              description="Ghi nhận khối lượng và bàn giao các loại phụ phẩm chế biến thủy sản, rác hữu cơ và rác thải nguy hại theo đúng tiêu chuẩn vệ sinh môi trường."
              actionLabel="+ Ghi Nhật Ký Đầu Tiên"
              onAction={() => setShowWasteModal(true)}
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3.5">Mã & Ngày Ghi Nhận</th>
                      <th className="p-3.5">Phân Loại Rác Thải</th>
                      <th className="p-3.5">Mô Tả Chi Tiết</th>
                      <th className="p-3.5 text-center">Khối Lượng (kg)</th>
                      <th className="p-3.5">Nơi Lưu Chứa Tạm</th>
                      <th className="p-3.5">Đơn Vị Thu Gom / Tiếp Nhận</th>
                      <th className="p-3.5 text-center">Trạng Thái</th>
                      <th className="p-3.5">Người Bàn Giao</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredWasteLogs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          Không tìm thấy nhật ký rác thải nào phù hợp điều kiện lọc.
                        </td>
                      </tr>
                    ) : (
                      filteredWasteLogs.map((w) => (
                        <tr
                          key={w.waste_id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="p-3.5">
                            <div className="font-mono font-bold text-slate-900 dark:text-white">
                              {w.log_code}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                              {w.log_date}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                              {w.waste_type === "ORGANIC_BYPRODUCT"
                                ? "Phụ phẩm chế biến"
                                : w.waste_type}
                            </span>
                          </td>
                          <td className="p-3.5 max-w-[220px]">
                            <p className="text-slate-700 dark:text-slate-300 font-medium">
                              {w.description}
                            </p>
                          </td>
                          <td className="p-3.5 text-center font-bold font-mono text-cyan-800 dark:text-cyan-400 text-sm">
                            {w.quantity_kg} kg
                          </td>
                          <td className="p-3.5 text-slate-600 dark:text-slate-400">
                            {w.storage_area}
                          </td>
                          <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">
                            {w.disposal_contractor}
                          </td>
                          <td className="p-3.5 text-center">
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                              {w.status === "TRANSFERRED" ? "ĐÃ BÀN GIAO" : w.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                            {w.handled_by_name}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== MODAL: CREATE WATER LOG ==================== */}
      {showWaterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-950 flex items-center justify-center text-cyan-600">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Phiếu Kiểm Tra Nguồn Nước Sản Xuất
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tiêu chuẩn QCVN 01-1:2018/BYT & SSOP Nguồn Nước
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWaterModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWaterLog} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Vị Trí Lấy Mẫu Nước / Đá <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={waterForm.sampling_point}
                  onChange={(e) => setWaterForm({ ...waterForm, sampling_point: e.target.value })}
                  placeholder="Ví dụ: Bồn nước ngầm cấp nước sơ chế (Điểm 1)..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ngày Lấy Mẫu
                  </label>
                  <input
                    type="date"
                    required
                    value={waterForm.sampling_date}
                    onChange={(e) => setWaterForm({ ...waterForm, sampling_date: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Giờ Lấy Mẫu
                  </label>
                  <input
                    type="time"
                    required
                    value={waterForm.sampling_time}
                    onChange={(e) => setWaterForm({ ...waterForm, sampling_time: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-cyan-50/50 dark:bg-cyan-950/20 p-3.5 rounded-2xl border border-cyan-100 dark:border-cyan-900/40">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Độ pH (6.5 - 8.5)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={waterForm.ph_level}
                    onChange={(e) =>
                      setWaterForm({ ...waterForm, ph_level: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Clo Dư (0.3 - 1.0)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={waterForm.chlorine_ppm}
                    onChange={(e) =>
                      setWaterForm({ ...waterForm, chlorine_ppm: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Độ Đục (&le; 2 NTU)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={waterForm.turbidity_ntu}
                    onChange={(e) =>
                      setWaterForm({ ...waterForm, turbidity_ntu: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Đánh Giá Cảm Quan Mẫu Nước
                </label>
                <input
                  type="text"
                  required
                  value={waterForm.sensory_result}
                  onChange={(e) => setWaterForm({ ...waterForm, sensory_result: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Người Kiểm Tra
                  </label>
                  <input
                    type="text"
                    required
                    value={waterForm.tested_by_name}
                    onChange={(e) => setWaterForm({ ...waterForm, tested_by_name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Người Xác Nhận (QA)
                  </label>
                  <input
                    type="text"
                    value={waterForm.verified_by_name}
                    onChange={(e) =>
                      setWaterForm({ ...waterForm, verified_by_name: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowWaterModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-md"
                >
                  Lưu Phiếu Kiểm Tra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ACTIVE WATER LIMIT PROFILE ==================== */}
      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-950 flex items-center justify-center text-cyan-600">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Cấu Hình Ngưỡng Nước Chuẩn QCVN
                  </h3>
                  <p className="text-xs text-slate-500">
                    Phê duyệt ngưỡng kỹ thuật cho toàn nhà máy
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLimitModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLimitProfile} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mã Bộ Ngưỡng
                </label>
                <input
                  type="text"
                  required
                  value={limitForm.profile_code}
                  onChange={(e) => setLimitForm({ ...limitForm, profile_code: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên Bộ Ngưỡng & Quy Chuẩn Áp Dụng
                </label>
                <input
                  type="text"
                  required
                  value={limitForm.profile_name}
                  onChange={(e) => setLimitForm({ ...limitForm, profile_name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    pH Tối Thiểu (Min)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={limitForm.ph_min}
                    onChange={(e) =>
                      setLimitForm({ ...limitForm, ph_min: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    pH Tối Đa (Max)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={limitForm.ph_max}
                    onChange={(e) =>
                      setLimitForm({ ...limitForm, ph_max: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Clo Dư Tối Thiểu (mg/L)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={limitForm.chlorine_min_ppm}
                    onChange={(e) =>
                      setLimitForm({
                        ...limitForm,
                        chlorine_min_ppm: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Clo Dư Tối Đa (mg/L)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={limitForm.chlorine_max_ppm}
                    onChange={(e) =>
                      setLimitForm({
                        ...limitForm,
                        chlorine_max_ppm: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLimitModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-md"
                >
                  Kích Hoạt Ngưỡng ACTIVE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADD CHEMICAL ==================== */}
      {showChemicalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-950 flex items-center justify-center text-cyan-600">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Bổ Sung Hóa Chất Phê Duyệt
                  </h3>
                  <p className="text-xs text-slate-500">Biểu mẫu BM01-SSOP-HOACHAT</p>
                </div>
              </div>
              <button
                onClick={() => setShowChemicalModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateChemical} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mã Hóa Chất <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={chemicalForm.chemical_code}
                    onChange={(e) =>
                      setChemicalForm({ ...chemicalForm, chemical_code: e.target.value })
                    }
                    placeholder="CLO-01, CIP-01..."
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tồn Kho Ban Đầu (kg)
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={chemicalForm.current_stock_kg}
                    onChange={(e) =>
                      setChemicalForm({
                        ...chemicalForm,
                        current_stock_kg: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên Thương Mại & Nồng Độ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={chemicalForm.chemical_name}
                  onChange={(e) =>
                    setChemicalForm({ ...chemicalForm, chemical_name: e.target.value })
                  }
                  placeholder="Ví dụ: Clorin Nippon 70% (Nhật Bản)..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mục Đích Sử Dụng
                </label>
                <input
                  type="text"
                  required
                  value={chemicalForm.purpose}
                  onChange={(e) => setChemicalForm({ ...chemicalForm, purpose: e.target.value })}
                  placeholder="Khử trùng nước rửa cá fillet, ngâm rửa dao thớt..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nhà Cung Cấp
                  </label>
                  <input
                    type="text"
                    required
                    value={chemicalForm.supplier_name}
                    onChange={(e) =>
                      setChemicalForm({ ...chemicalForm, supplier_name: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cấp Thực Phẩm (Food-Grade)
                  </label>
                  <select
                    value={chemicalForm.is_food_grade ? "TRUE" : "FALSE"}
                    onChange={(e) =>
                      setChemicalForm({ ...chemicalForm, is_food_grade: e.target.value === "TRUE" })
                    }
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="TRUE">✓ Đạt chuẩn Food-Grade</option>
                    <option value="FALSE">Non Food-Grade</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tỷ Lệ Pha Loãng Chuẩn
                </label>
                <input
                  type="text"
                  required
                  value={chemicalForm.dilution_ratio}
                  onChange={(e) =>
                    setChemicalForm({ ...chemicalForm, dilution_ratio: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-xs font-mono font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowChemicalModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-md"
                >
                  Thêm Vào Danh Mục
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADD WASTE LOG ==================== */}
      {showWasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-950 flex items-center justify-center text-cyan-600">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Ghi Nhật Ký Thu Gom & Xử Lý Rác Thải
                  </h3>
                  <p className="text-xs text-slate-500">Biểu mẫu BM01-SSOP-RACTHAI</p>
                </div>
              </div>
              <button
                onClick={() => setShowWasteModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWaste} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phân Loại Rác Thải
                  </label>
                  <select
                    value={wasteForm.waste_type}
                    onChange={(e) => setWasteForm({ ...wasteForm, waste_type: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="ORGANIC_BYPRODUCT">Phụ phẩm cá tra (Xương, đầu, da)</option>
                    <option value="DOMESTIC_ORGANIC">Rác hữu cơ sinh hoạt / Nhà ăn</option>
                    <option value="INORGANIC_RECYCLABLE">Bao bì nilon / Thùng carton</option>
                    <option value="HAZARDOUS_WASTE">
                      Rác thải nguy hại (Bóng đèn, pin, vỏ hóa chất)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Khối Lượng Thu Gom (kg) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={wasteForm.quantity_kg}
                    onChange={(e) =>
                      setWasteForm({ ...wasteForm, quantity_kg: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mô Tả Chi Tiết Chất Thải
                </label>
                <input
                  type="text"
                  required
                  value={wasteForm.description}
                  onChange={(e) => setWasteForm({ ...wasteForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Đơn Vị Thu Gom / Tiếp Nhận Xử Lý
                </label>
                <input
                  type="text"
                  required
                  value={wasteForm.disposal_contractor}
                  onChange={(e) =>
                    setWasteForm({ ...wasteForm, disposal_contractor: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Khu Vực Lưu Chứa Tạm
                  </label>
                  <input
                    type="text"
                    required
                    value={wasteForm.storage_area}
                    onChange={(e) => setWasteForm({ ...wasteForm, storage_area: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Người Thực Hiện Bàn Giao
                  </label>
                  <input
                    type="text"
                    required
                    value={wasteForm.handled_by_name}
                    onChange={(e) =>
                      setWasteForm({ ...wasteForm, handled_by_name: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowWasteModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-md"
                >
                  Lưu Nhật Ký Rác Thải
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
