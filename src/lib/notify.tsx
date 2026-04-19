import { toast } from "sonner";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, ShoppingBag, X } from "lucide-react";

type NotifyOpts = {
  description?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
};

export const notify = {
  success: (title: string, opts: NotifyOpts = {}) =>
    toast.success(title, {
      description: opts.description,
      duration: opts.duration ?? 4000,
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      action: opts.action,
    }),

  error: (title: string, opts: NotifyOpts = {}) =>
    toast.error(title, {
      description: opts.description,
      duration: opts.duration ?? 5000,
      icon: <AlertCircle className="w-5 h-5 text-rose-500" />,
      action: opts.action,
    }),

  warning: (title: string, opts: NotifyOpts = {}) =>
    toast.warning(title, {
      description: opts.description,
      duration: opts.duration ?? 4500,
      icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
      action: opts.action,
    }),

  info: (title: string, opts: NotifyOpts = {}) =>
    toast.info(title, {
      description: opts.description,
      duration: opts.duration ?? 4000,
      icon: <Info className="w-5 h-5 text-sky-500" />,
      action: opts.action,
    }),

  /** Premium "new order" notification with rich highlight */
  newOrder: (params: {
    orderNumber: string | number;
    customerName: string;
    amount: string;
    onView?: () => void;
  }) => {
    const { orderNumber, customerName, amount, onView } = params;
    return toast.custom(
      (id) => (
        <div className="relative flex w-[360px] items-start gap-3 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background p-4 shadow-[0_12px_40px_-10px_hsl(var(--primary)/0.35)] ring-1 ring-primary/10 backdrop-blur-xl">
          <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-primary to-primary/60" />
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-md shadow-primary/30">
            <ShoppingBag className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                طلب جديد
              </span>
              <span className="text-xs text-muted-foreground">#{orderNumber}</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-foreground truncate">{customerName}</p>
            <p className="text-xs text-muted-foreground">المبلغ: <span className="font-semibold text-foreground">{amount}</span></p>
            {onView && (
              <button
                onClick={() => {
                  onView();
                  toast.dismiss(id);
                }}
                className="mt-2 inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                عرض الطلب
              </button>
            )}
          </div>
          <button
            onClick={() => toast.dismiss(id)}
            className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="إغلاق"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
      { duration: 8000 }
    );
  },

  dismiss: toast.dismiss,
};

export { toast };