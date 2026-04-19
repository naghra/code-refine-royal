import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { Info } from "lucide-react";

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
      toastOptions={{
        unstyled: false,
        icons: {
          // Default icon when toast() is called without a type
          info: <Info className="w-5 h-5 text-sky-500" />,
        },
        classNames: {
          toast:
            "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border border-border/60 bg-background/95 backdrop-blur-xl p-4 pr-5 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.02] border-r-4 border-r-primary/60 data-[type=success]:border-r-emerald-500 data-[type=error]:border-r-rose-500 data-[type=warning]:border-r-amber-500 data-[type=info]:border-r-sky-500",
          title: "text-sm font-semibold text-foreground leading-tight",
          description: "text-xs text-muted-foreground mt-0.5 leading-relaxed",
          icon: "shrink-0 [&_svg]:w-5 [&_svg]:h-5",
          actionButton:
            "!bg-primary !text-primary-foreground !rounded-lg !px-3 !py-1.5 !text-xs !font-medium hover:!opacity-90 transition-opacity",
          cancelButton:
            "!bg-muted !text-muted-foreground !rounded-lg !px-3 !py-1.5 !text-xs",
          closeButton:
            "!bg-muted/60 hover:!bg-muted !border-0 !text-muted-foreground hover:!text-foreground !rounded-full",
          success: "[&_[data-icon]]:text-emerald-500",
          error: "[&_[data-icon]]:text-rose-500",
          warning: "[&_[data-icon]]:text-amber-500",
          info: "[&_[data-icon]]:text-sky-500",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
