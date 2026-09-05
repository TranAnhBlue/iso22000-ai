import type { ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" onClick={onClose}>
      <div
        className={`max-h-[88vh] w-full overflow-y-auto rounded-2xl border bg-card p-6 shadow-xl ${wide ? "max-w-4xl" : "max-w-lg"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30";

export function Btn({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const v = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    outline: "border hover:bg-muted",
    ghost: "hover:bg-muted",
    danger: "bg-destructive text-destructive-foreground hover:opacity-90",
    success: "bg-emerald-600 text-white hover:opacity-90",
  }[variant];
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition disabled:opacity-40 ${v} ${
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-2 text-sm"
      }`}
    >
      {children}
    </button>
  );
}

export function Tag({ children, tone }: { children: ReactNode; tone: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {children}
    </span>
  );
}

export function Tabs({
  value,
  onChange,
  items,
}: {
  value: string;
  onChange: (v: string) => void;
  items: { key: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border bg-card p-1">
      {items.map((i) => (
        <button
          key={i.key}
          onClick={() => onChange(i.key)}
          className={`rounded-lg px-3 py-1.5 text-sm transition ${
            value === i.key ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          }`}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}
