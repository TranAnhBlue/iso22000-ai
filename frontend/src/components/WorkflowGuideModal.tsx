import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  GitFork,
  CheckCircle2,
  AlertTriangle,
  Flame,
  UserCheck,
  BookOpen,
  ArrowRight,
  Layers,
  Sliders,
  ShieldCheck,
  Check,
  X,
  FileCheck2,
  Workflow,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface WorkflowGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkflowGuideModal: React.FC<WorkflowGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"PRINCIPLES" | "NODES" | "STEPS" | "HACCP_RULES">("PRINCIPLES");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto font-sans bg-white p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-200">
        {/* Header */}
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 border border-blue-200">
              <Workflow className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Hướng Dẫn Thiết Kế Lưu Đồ & Quản Lý Quy Trình
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold border border-blue-200">
                  Chuẩn Hóa FSMS
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-1">
                Nguyên tắc xây dựng lưu đồ công nghệ sản xuất, nhận diện điểm kiểm soát tới hạn và thiết lập luồng phê duyệt đa cấp.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-2 mt-4">
          <button
            onClick={() => setActiveTab("PRINCIPLES")}
            className={`pb-3 px-3.5 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === "PRINCIPLES"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            1. Nguyên Tắc Thiết Kế
          </button>
          <button
            onClick={() => setActiveTab("NODES")}
            className={`pb-3 px-3.5 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === "NODES"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            2. Các Loại Công Đoạn
          </button>
          <button
            onClick={() => setActiveTab("STEPS")}
            className={`pb-3 px-3.5 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === "STEPS"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            3. Hướng Dẫn Thao Tác
          </button>
          <button
            onClick={() => setActiveTab("HACCP_RULES")}
            className={`pb-3 px-3.5 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === "HACCP_RULES"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            4. Yêu Cầu Thực Địa
          </button>
        </div>

        {/* TAB 1: PRINCIPLES */}
        {activeTab === "PRINCIPLES" && (
          <div className="space-y-4 mt-4 text-xs text-slate-700 leading-relaxed">
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200">
              <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-blue-700" />
                Mục Đích Của Lưu Đồ Công Đoạn & Quy Trình
              </h4>
              <p>
                Lưu đồ quy trình là bức tranh tổng thể thể hiện dòng chảy liên tục của nguyên vật liệu, phụ gia, bán thành phẩm và sản phẩm cuối cùng. Lưu đồ là căn cứ bắt buộc để Đội An toàn thực phẩm tiến hành phân tích mối nguy, xác định các điểm kiểm soát tới hạn (CCP) và các chương trình tiên quyết điều hành (oPRP).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Tính Tuần Tự & Liên Tục
                </div>
                <p className="text-slate-600 text-[11px] leading-5">
                  Lưu đồ phải bắt đầu từ khâu <b>Tiếp nhận nguyên vật liệu</b> và kết thúc ở khâu <b>Xuất kho thành phẩm / Giao hàng</b>. Không bỏ sót bất kỳ bước trung gian nào như chờ lắng, rã đông hay lưu bồn tạm.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider">
                  <GitFork className="w-4 h-4 text-indigo-600" />
                  Đầu Vào, Đầu Ra & Rẽ Nhánh
                </div>
                <p className="text-slate-600 text-[11px] leading-5">
                  Tại các điểm phân loại hoặc kiểm nghiệm chất lượng, cần thể hiện rõ nhánh xử lý <b>ĐẠT</b> (chuyển tiếp công đoạn sau) và nhánh <b>KHÔNG ĐẠT</b> (cô lập, tái chế hoặc chuyển sang tiêu hủy).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-wider">
                  <Flame className="w-4 h-4 text-amber-600" />
                  Đánh Dấu Điểm Tới Hạn (CCP)
                </div>
                <p className="text-slate-600 text-[11px] leading-5">
                  Mọi công đoạn được xác định là CCP (như gia nhiệt, tiệt trùng, rà kim loại, làm lạnh sâu) phải được đánh dấu nổi bật với mã hiệu (VD: CCP1, CCP2) và kèm theo yêu cầu kỹ thuật giám sát.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 space-y-2 mt-4">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-blue-600" />
                Các Thông Tin Kèm Theo Cần Thu Thập Cho Từng Bước:
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700 list-disc list-inside">
                <li>Thời gian xử lý và nhiệt độ công đoạn.</li>
                <li>Dụng cụ, thiết bị chế biến và hóa chất phụ gia sử dụng.</li>
                <li>Điều kiện bảo quản và thời gian chờ bán thành phẩm.</li>
                <li>Đường đi của chất thải, phế phẩm và bao bì đóng gói.</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 2: NODES */}
        {activeTab === "NODES" && (
          <div className="space-y-4 mt-4 text-xs text-slate-700">
            <p className="text-xs text-slate-600">
              Trong Bộ thiết kế lưu đồ động, mỗi khối công đoạn (Node) được phân loại theo 4 vai trò chức năng:
            </p>

            <div className="space-y-3">
              {/* Process */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm">
                    <Check className="w-3.5 h-3.5" />
                    Công Đoạn Sản Xuất (Process)
                  </span>
                  <div>
                    <div className="font-bold text-emerald-950 text-xs">Các bước chế biến / gia công kỹ thuật</div>
                    <div className="text-[11px] text-emerald-800">VD: Tiếp nhận nguyên liệu, Rửa sơ bộ, Cắt định hình, Phối trộn, Đóng gói...</div>
                  </div>
                </div>
                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300">
                  Thao tác tuần tự
                </span>
              </div>

              {/* Decision */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Điểm Rẽ Nhánh & Đánh Giá (Decision)
                  </span>
                  <div>
                    <div className="font-bold text-amber-950 text-xs">Kiểm tra chỉ tiêu / Đạt hoặc Không đạt</div>
                    <div className="text-[11px] text-amber-800">VD: Kiểm tra cảm quan đầu vào, đo độ ẩm bột, kiểm tra độ kín nắp bao bì...</div>
                  </div>
                </div>
                <span className="text-[11px] text-amber-700 font-semibold bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300">
                  Rẽ nhánh xử lý
                </span>
              </div>

              {/* CCP Check */}
              <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm">
                    <Flame className="w-3.5 h-3.5" />
                    Điểm Kiểm Soát Tới Hạn (CCP Check)
                  </span>
                  <div>
                    <div className="font-bold text-rose-950 text-xs">Bước kiểm soát trọng yếu loại bỏ mối nguy ATTP</div>
                    <div className="text-[11px] text-rose-800">VD: Thanh trùng sữa ≥ 85°C/15s, Dò kim loại đóng gói, Cấp đông nhanh ≤ -18°C...</div>
                  </div>
                </div>
                <span className="text-[11px] text-rose-700 font-bold bg-rose-100 px-2.5 py-1 rounded-md border border-rose-300 animate-pulse">
                  Bắt buộc ghi nhật ký
                </span>
              </div>

              {/* Approval */}
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm">
                    <UserCheck className="w-3.5 h-3.5" />
                    Bước Phê Duyệt (Approval)
                  </span>
                  <div>
                    <div className="font-bold text-blue-950 text-xs">Chờ ký duyệt của Cán bộ phụ trách / Lãnh đạo</div>
                    <div className="text-[11px] text-blue-800">VD: QA duyệt chứng nhận COA xuất kho, Trưởng ban ATTP ký biên bản đánh giá...</div>
                  </div>
                </div>
                <span className="text-[11px] text-blue-700 font-semibold bg-blue-100 px-2.5 py-1 rounded-md border border-blue-300">
                  Xác nhận thẩm quyền
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: STEPS */}
        {activeTab === "STEPS" && (
          <div className="space-y-4 mt-4 text-xs text-slate-700 leading-relaxed">
            <div className="font-bold text-slate-900 text-sm mb-2">
              Quy Trình 5 Bước Thiết Lập Lưu Đồ Trong Hệ Thống:
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <div className="font-bold text-slate-900">Khai báo thông tin chung</div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    Nhập <b>Mã quy trình</b> (VD: <code>WF-HACCP-TEA</code>), <b>Tên quy trình</b>, chọn <b>Phân hệ</b> (HACCP, Đánh giá nội bộ, Mua hàng...) và <b>Phiên bản</b>.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <div className="font-bold text-slate-900">Thêm và sắp xếp các công đoạn</div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    Bấm nút <code>+ Thêm công đoạn</code>. Sử dụng các nút mũi tên lên/xuống ở Tab "Danh Sách Các Bước" để di chuyển vị trí các bước theo đúng trình tự công nghệ thực tế.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <div className="font-bold text-slate-900">Cấu hình thuộc tính chi tiết cho từng bước</div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    Bấm vào khối công đoạn cần cấu hình trên sơ đồ trực quan. Bảng bên phải sẽ mở ra cho phép:
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-500">
                      <li>Đổi loại công đoạn (Process, Decision, CCP Check, Approval).</li>
                      <li>Phân công <b>Phòng ban phụ trách</b> (Ban QLCL, Sản xuất, Thiết bị...).</li>
                      <li>Ghi chú <b>Yêu cầu kỹ thuật / Giám sát</b> cụ thể.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  4
                </span>
                <div>
                  <div className="font-bold text-slate-900">Đánh dấu và cài đặt ngưỡng CCP</div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    Nếu công đoạn là điểm kiểm soát tới hạn, tích chọn vào ô <b>Điểm Kiểm Soát Tới Hạn (CCP)</b>. Khối này sẽ tự động chuyển sang màu đỏ nổi bật và liên kết với phân hệ giám sát đo đạc.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  5
                </span>
                <div>
                  <div className="font-bold text-slate-900">Lưu và ban hành quy trình</div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    Bấm <b>Lưu Quy Trình</b> ở góc trên bên phải. Hệ thống sẽ tự động đồng bộ sơ đồ vào thư viện quy trình động và hiển thị trên bảng lưu đồ của kế hoạch liên quan.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: HACCP_RULES */}
        {activeTab === "HACCP_RULES" && (
          <div className="space-y-4 mt-4 text-xs text-slate-700 leading-relaxed">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Xác Nhận Lưu Đồ Trên Thực Địa (On-site Confirmation)
              </h4>
              <p className="text-emerald-900 text-[11px]">
                Theo chuẩn mực an toàn thực phẩm, Đội An toàn thực phẩm phải tiến hành thẩm tra thực tế tại hiện trường nhà máy trong suốt các giờ hoạt động để xác nhận tính chính xác của lưu đồ quy trình.
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Checklist 4 Nội Dung Kiểm Tra Thực Địa:
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800">1. Đối chiếu đường đi nguyên liệu:</span>
                  <span className="text-slate-600 text-[11px] ml-1">
                    Kiểm tra đường đi của nguyên vật liệu có bị cắt ngang luồng phế thải hoặc luồng nhân viên không đảm bảo vệ sinh (nguy cơ nhiễm chéo).
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800">2. Kiểm tra thời gian chờ và nhiệt độ:</span>
                  <span className="text-slate-600 text-[11px] ml-1">
                    Đo đạc nhiệt độ thực tế tại từng công đoạn và thời gian chờ tối đa giữa các bước để đảm bảo vi sinh vật không thể sinh sôi phát triển.
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800">3. Rà soát điểm hồi lưu và tái chế (Rework):</span>
                  <span className="text-slate-600 text-[11px] ml-1">
                    Nếu sản phẩm có tái chế hoặc phối trộn mẻ trước vào mẻ sau, phải thể hiện rõ nhánh hồi lưu và biện pháp kiểm soát dị ứng/chất lượng.
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800">4. Biên bản xác nhận có chữ ký Đội ATTP:</span>
                  <span className="text-slate-600 text-[11px] ml-1">
                    Biên bản họp thực địa xác nhận lưu đồ phải có chữ ký của đầy đủ các thành viên Đội ATTP (Quản đốc sản xuất, QA Lead, Kỹ thuật cơ điện).
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-4 mt-6 border-t border-slate-200">
          <Button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2"
          >
            Đã Hiểu & Đóng Hướng Dẫn
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
