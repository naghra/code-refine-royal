import { memo } from "react";
import { ShoppingCart } from "lucide-react";

function StickyMobileBuyBarImpl() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden safe-area-bottom" dir="rtl">
      <div className="bg-background/95 backdrop-blur-md border-t border-border px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <button
          onClick={() => {
            document.getElementById("order-form-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
          className="w-full h-12 rounded-xl font-bold text-base text-destructive-foreground bg-destructive hover:bg-destructive/90 shadow-lg transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
          type="button"
        >
          <ShoppingCart className="w-5 h-5" />
          <span>اضغط هنا للطلب</span>
        </button>
      </div>
    </div>
  );
}

export default memo(StickyMobileBuyBarImpl);