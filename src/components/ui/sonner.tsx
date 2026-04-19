import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { Info, CheckCircle2, AlertCircle, AlertTriangle, Loader2 } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      dir="rtl"
      visibleToasts={4}
      duration={4000}
      expand
      gap={12}
      offset={20}
      style={{ ["--width" as any]: "380px" }}
      icons={{
        success: (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" strokeWidth={2.5} />
          </span>
        ),
        error: (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-500/10 ring-1 ring-rose-500/20">
            <AlertCircle className="h-5 w-5 text-rose-500" strokeWidth={2.5} />
          </span>
        ),
        warning: (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/20">
            <AlertTriangle className="h-5 w-5 text-amber-500" strokeWidth={2.5} />
          </span>
        ),
        info: (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/10 ring-1 ring-sky-500/20">
            <Info className="h-5 w-5 text-sky-500" strokeWidth={2.5} />
          </span>
        ),
        loading: (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          </span>
        ),
      }}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "group pointer-events-auto relative flex w-full items-center gap-3.5 overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-background to-background/95 backdrop-blur-2xl p-4 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.25),0_8px_20px_-8px_rgba(0,0,0,0.15)] ring-1 ring-white/5 transition-all hover:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] data-[type=success]:from-emerald-500/[0.04] data-[type=error]:from-rose-500/[0.04] data-[type=warning]:from-amber-500/[0.04] data-[type=info]:from-sky-500/[0.04]",
          title: "text-[13.5px] font-semibold text-foreground leading-tight tracking-tight",
          description: "text-xs text-muted-foreground mt-1 leading-relaxed",
          icon: "shrink-0",
          actionButton:
            "!bg-foreground !text-background !rounded-lg !px-3.5 !py-2 !text-xs !font-semibold hover:!opacity-90 transition-all !shadow-sm",
          cancelButton:
            "!bg-muted/80 !text-muted-foreground !rounded-lg !px-3 !py-2 !text-xs hover:!bg-muted",
          closeButton:
            "!bg-background !border !border-border/60 !text-muted-foreground hover:!text-foreground hover:!bg-muted !rounded-full !w-6 !h-6 !left-auto !right-2 !top-2 transition-all opacity-0 group-hover:opacity-100",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
