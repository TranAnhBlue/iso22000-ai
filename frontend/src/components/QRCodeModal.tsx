import { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Printer, ShieldCheck, Smartphone, CheckCircle2 } from "lucide-react";
import logoImg from "@/assets/logo.png";

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  qrCodeText: string;
  lotNumber: string;
  productName: string;
  mfgDate?: string;
  expDate?: string;
  unit?: string;
  quantity?: number;
}

export function QRCodeModal({
  open,
  onOpenChange,
  title,
  qrCodeText,
  lotNumber,
  productName,
  mfgDate,
  expDate,
  unit,
  quantity,
}: QRCodeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // Create real scannable QR Code content (URL or code)
  const scannableContent = typeof window !== "undefined"
    ? `${window.location.origin}/traceability?query_code=${encodeURIComponent(lotNumber || qrCodeText)}`
    : `https://fsms.wcert.vn/traceability?query_code=${encodeURIComponent(lotNumber || qrCodeText)}`;

  useEffect(() => {
    if (open && (lotNumber || qrCodeText)) {
      QRCode.toDataURL(scannableContent, {
        width: 250,
        margin: 1,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
        errorCorrectionLevel: "M",
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("Lỗi tạo QR:", err));
    }
  }, [open, lotNumber, qrCodeText, scannableContent]);

  const printQRLabel = () => {
    document.body.classList.add("printing-qr-label-only");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("printing-qr-label-only");
    }, 1200);
  };

  return (
    <>
      {/* CSS ISOLATION FOR LABEL PRINTING ONLY */}
      <style>{`
        @media print {
          body.printing-qr-label-only * {
            visibility: hidden !important;
          }
          body.printing-qr-label-only #printable-qr-label,
          body.printing-qr-label-only #printable-qr-label * {
            visibility: visible !important;
          }
          body.printing-qr-label-only #printable-qr-label {
            position: fixed !important;
            left: 50% !important;
            top: 20px !important;
            transform: translateX(-50%) !important;
            width: 105mm !important;
            max-width: 100% !important;
            border: 2px solid #000 !important;
            border-radius: 8px !important;
            margin: 0 !important;
            padding: 16px !important;
            background: #ffffff !important;
            box-shadow: none !important;
            z-index: 999999 !important;
          }
        }
      `}</style>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              {title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tem nhãn mã QR chuẩn ISO 22000 phục vụ dán lên thùng/bao bì và quét kiểm tra nhanh.
            </DialogDescription>
          </DialogHeader>

          {/* TEM NHÃN IN (PRINTABLE LABEL CARD) */}
          <div
            id="printable-qr-label"
            className="rounded-xl border-2 border-slate-300 bg-white p-4 text-slate-900 shadow-sm space-y-3.5"
          >
            {/* Header logo & Brand */}
            <div className="flex items-center justify-between border-b pb-2 border-slate-200">
              <div className="flex items-center gap-2">
                <img src={logoImg} alt="WCERT" className="h-7 w-auto object-contain" />
                <div>
                  <div className="text-xs font-bold leading-tight text-slate-900">WCERT FOOD SAFETY</div>
                  <div className="text-[9px] text-slate-500 font-mono">ISO 22000:2018 CERTIFIED</div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono border border-slate-200">
                TEM LÔ HÀNG
              </span>
            </div>

            {/* QR Code & Information */}
            <div className="flex items-center gap-3">
              <div className="shrink-0 flex flex-col items-center bg-white p-1 rounded-lg border border-slate-200">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" className="h-28 w-28 object-contain" />
                ) : (
                  <div className="h-28 w-28 flex items-center justify-center text-xs text-slate-400">Đang tải...</div>
                )}
                <span className="text-[9px] font-mono text-slate-500 font-bold mt-0.5">
                  {lotNumber || qrCodeText}
                </span>
              </div>

              <div className="flex-1 space-y-1.5 text-xs text-left">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-semibold block">Tên sản phẩm / Lô:</span>
                  <div className="font-bold text-slate-900 leading-tight text-sm">{productName}</div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Mã Lô:</span>
                    <span className="font-mono font-bold text-emerald-700">{lotNumber}</span>
                  </div>
                  {quantity ? (
                    <div>
                      <span className="text-slate-500 text-[10px] block">Số lượng:</span>
                      <span className="font-bold text-slate-900">{quantity} {unit}</span>
                    </div>
                  ) : null}
                  {mfgDate ? (
                    <div>
                      <span className="text-slate-500 text-[10px] block">Ngày SX (MFG):</span>
                      <span className="font-medium text-slate-800">{mfgDate}</span>
                    </div>
                  ) : null}
                  {expDate ? (
                    <div>
                      <span className="text-slate-500 text-[10px] block">Hạn dùng (EXP):</span>
                      <span className="font-bold text-rose-700">{expDate}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Footer stamp */}
            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-100">
              <span className="flex items-center gap-1 font-medium text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" /> Kiểm soát CCP: ĐẠT
              </span>
              <span className="font-mono text-[9px]">fsms.wcert.vn</span>
            </div>
          </div>

          {/* User Guide Box */}
          <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground flex items-start gap-2">
            <Smartphone className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <b>Cách quét thử:</b> Mở ứng dụng <b>Camera / Zalo</b> trên điện thoại quét trực tiếp mã QR trên màn hình → Điện thoại sẽ tự động mở trang hồ sơ truy xuất nguồn gốc của lô hàng.
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Đóng
            </Button>
            <Button size="sm" onClick={printQRLabel} className="w-full sm:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              <Printer className="h-4 w-4" />
              In Tem Nhãn QR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
