/**
 * Compatibility shim: forwards the legacy useToast API to sonner so all
 * existing `toast({ title, description, variant })` calls automatically get
 * the new elegant sonner styling without touching every call site.
 */
import { toast as sonnerToast } from "sonner";

type Variant = "default" | "destructive" | "success" | "warning" | "info";

interface ToastArgs {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: Variant;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

function toString(node: React.ReactNode): string {
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  return String(node);
}

function showToast({ title, description, variant = "default", duration, action }: ToastArgs) {
  const t = toString(title);
  const d = description != null ? toString(description) : undefined;
  const opts = { description: d, duration, action };
  switch (variant) {
    case "destructive":
      return sonnerToast.error(t, opts);
    case "success":
      return sonnerToast.success(t, opts);
    case "warning":
      return sonnerToast.warning(t, opts);
    case "info":
      return sonnerToast.info(t, opts);
    default:
      return sonnerToast(t, opts);
  }
}

export function useToast() {
  return {
    toast: showToast,
    dismiss: (id?: string | number) => sonnerToast.dismiss(id),
    toasts: [] as any[],
  };
}

export const toast = showToast;