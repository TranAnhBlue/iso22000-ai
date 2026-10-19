import React from "react";
import { LucideIcon, FolderOpen, Plus, BookOpen, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  guideLabel?: string;
  onGuide?: () => void;
  onOpenGuide?: () => void;
  compact?: boolean;
  className?: string;
  loading?: boolean;
}

export function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description = "Hiện tại hệ thống chưa ghi nhận dữ liệu nào. Hãy bắt đầu bằng cách thêm mới bản ghi đầu tiên.",
  actionLabel,
  onAction,
  guideLabel = "Xem hướng dẫn nghiệp vụ",
  onGuide,
  onOpenGuide,
  compact = false,
  className = "",
  loading = false,
}: EmptyStateProps) {
  if (loading) {
    return (
      <div
        className={`flex flex-col items-center justify-center text-center rounded-2xl border-2 border-dashed border-border/50 bg-card/20 backdrop-blur-xs transition-all duration-300 ${
          compact ? "p-6 sm:p-8" : "p-10 sm:p-14 my-4"
        } ${className}`}
      >
        <div className="relative mb-3 flex items-center justify-center">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 border border-border shadow-inner text-muted-foreground">
            <RefreshCw className="h-6 w-6 text-primary animate-spin" />
          </div>
        </div>
        <h3 className="text-base font-semibold tracking-tight text-foreground">
          Đang đồng bộ dữ liệu...
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">Vui lòng chờ trong giây lát</p>
      </div>
    );
  }

  const handleGuide = onGuide || onOpenGuide;
  // The button already renders a Plus icon. Normalize older labels that
  // included a leading "+" so the action never displays it twice.
  const normalizedActionLabel = actionLabel?.replace(/^\s*\+\s*/, "");
  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-2xl border-2 border-dashed border-border/80 bg-card/40 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 ${
        compact ? "p-6 sm:p-8" : "p-10 sm:p-14 my-4"
      } ${className}`}
    >
      <div className="relative mb-4 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl animate-pulse" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/80 border border-border shadow-inner text-muted-foreground group-hover:scale-105 transition-transform duration-300">
          <Icon className="h-8 w-8 text-primary/70" />
        </div>
      </div>

      <h3 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{title}</h3>

      {description && (
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}

      {(onAction || handleGuide) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onAction && normalizedActionLabel && (
            <Button
              onClick={onAction}
              className="bg-primary text-primary-foreground font-medium shadow-md shadow-primary/20 hover:bg-primary/90 gap-2 h-10 px-5 rounded-xl cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{normalizedActionLabel}</span>
            </Button>
          )}

          {handleGuide && (
            <Button
              variant="outline"
              onClick={handleGuide}
              className="border-border/80 hover:bg-accent/60 gap-2 h-10 px-4 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <BookOpen className="h-4 w-4 text-primary" />
              <span>{guideLabel}</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
