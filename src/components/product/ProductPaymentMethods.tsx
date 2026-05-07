import { memo } from "react";
import applePayIcon from "@/assets/apple_pay_mini.avif";
import bankIcon from "@/assets/bank_mini.avif";
import codIcon from "@/assets/cod_mini.avif";
import sbcIcon from "@/assets/sbc.avif";
import madeInKsaIcon from "@/assets/made-in-ksa.svg";

function ProductPaymentMethodsImpl() {
  return (
    <section className="flex items-center justify-center gap-3 mb-5">
      <img src={madeInKsaIcon} alt="صنع في السعودية" width={32} height={32} className="h-8 w-auto" loading="lazy" decoding="async" />
      <img src={applePayIcon} alt="Apple Pay" width={48} height={32} className="h-8 w-auto" loading="lazy" decoding="async" />
      <img src={bankIcon} alt="تحويل بنكي" width={48} height={32} className="h-8 w-auto" loading="lazy" decoding="async" />
      <img src={codIcon} alt="الدفع عند الاستلام" width={48} height={32} className="h-8 w-auto" loading="lazy" decoding="async" />
      <img src={sbcIcon} alt="SBC" width={48} height={32} className="h-8 w-auto" loading="lazy" decoding="async" />
    </section>
  );
}

export default memo(ProductPaymentMethodsImpl);