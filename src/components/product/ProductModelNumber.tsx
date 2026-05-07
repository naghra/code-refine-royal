import { memo } from "react";
import barcodeIcon from "@/assets/barcode-icon.png";

function ProductModelNumberImpl({ skuCode }: { skuCode: string }) {
  return (
    <section className="bg-background p-4 rounded-md mb-5 border border-border">
      <div className="flex items-center justify-between">
        <span className="text-store-primary text-sm flex items-center gap-1">
          <img src={barcodeIcon} alt="باركود" width={20} height={20} className="w-5 h-5" loading="lazy" decoding="async" />
          <span>رقم الموديل</span>
        </span>
        <span className="text-xs text-store-secondary">{skuCode}</span>
      </div>
    </section>
  );
}

export default memo(ProductModelNumberImpl);