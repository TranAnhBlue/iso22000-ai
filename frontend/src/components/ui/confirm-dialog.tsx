import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, HelpCircle } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "default" | "warning";
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Xác nhận hành động",
  description = "Bạn có chắc chắn muốn thực hiện hành động này không? Hành động không thể hoàn tác.",
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy bỏ",
  variant = "destructive",
  loading = false,
}: ConfirmDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px] p-6">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                variant === "destructive"
                  ? "bg-rose-100 text-rose-600"
                  : variant === "warning"
                  ? "bg-amber-100 text-amber-600"
                  : "bg-blue-100 text-blue-600"
              }`}
            >
              {variant === "destructive" ? (
                <Trash2 className="w-5 h-5" />
              ) : variant === "warning" ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <HelpCircle className="w-5 h-5" />
              )}
            </div>
            <DialogTitle className="text-base font-bold text-slate-900 leading-snug">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-slate-100 mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="text-xs h-9"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={loading}
            className={`text-xs h-9 font-semibold ${
              variant === "destructive" ? "bg-rose-600 hover:bg-rose-700 text-white" : ""
            }`}
          >
            {loading ? "Đang xử lý..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
