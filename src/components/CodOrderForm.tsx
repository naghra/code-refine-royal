import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { User, Phone, MapPin, Minus, Plus, ShieldCheck, Truck, Package, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/useCurrency";

interface CodOrderFormProps {
  productName: string;
  productId?: string;
  unitPrice: number;
  compareAtPrice?: number;
  productImage?: string;
}

const CodOrderForm = ({ productName, productId, unitPrice, compareAtPrice, productImage }: CodOrderFormProps) => {
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const cs = currency.symbol;
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const totalPrice = unitPrice * quantity;

  const normalizeDigits = (str: string) =>
    str.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
       .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 2) errs.fullName = "يرجى إدخال الاسم الكامل";
    const normalizedPhone = normalizeDigits(phone.trim().replace(/\s/g, ""));
    if (!normalizedPhone) errs.phone = "يرجى إدخال رقم الهاتف";
    else if (!/^(05|5|9|6|7|\+)[0-9]{7,14}$/.test(normalizedPhone)) errs.phone = "رقم الهاتف غير صالح";
    return errs;
  }, [fullName, phone]);

  const handleSubmit = useCallback(async () => {
    const errs = validate();
    setErrors(errs);
    setSubmitError("");
    if (Object.keys(errs).length > 0) return;
    if (submitting) return;
    setSubmitting(true);

    try {
      // Check product flags upfront
      let requiresConfirmation = false;
      let hasGift = false;
      if (productId) {
        const { data: prodCheck } = await supabase
          .from("products")
          .select("requires_confirmation, has_gift")
          .eq("id", productId)
          .maybeSingle();
        requiresConfirmation = !!(prodCheck as any)?.requires_confirmation;
        hasGift = !!(prodCheck as any)?.has_gift;
      }

      // Always save the order — but mark unconfirmed if confirmation is required
      const { data, error } = await supabase.functions.invoke("create-order", {
        body: {
          customer_name: fullName.trim(),
          customer_phone: normalizeDigits(phone.trim().replace(/\s/g, "")),
          city: city.trim() || null,
          address: city.trim() || null,
          payment_method: "cod",
          shipping_method: "standard",
          subtotal: totalPrice,
          shipping_cost: 0,
          total: totalPrice,
          confirmed: !requiresConfirmation,
          confirmed_at: requiresConfirmation ? null : new Date().toISOString(),
          items: [{
            product_id: productId || null,
            product_name: productName,
            quantity,
            unit_price: unitPrice,
            total_price: totalPrice,
          }],
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Order creation failed");

      const orderId = data.order_id;

      // If confirmation required → go to /confirm with order_id
      if (requiresConfirmation) {
        const pending = {
          order_id: orderId,
          customer_name: fullName.trim(),
          customer_phone: normalizeDigits(phone.trim().replace(/\s/g, "")),
          product_id: productId || null,
          product_name: productName,
          product_image: productImage || null,
          quantity,
          unit_price: unitPrice,
          total: totalPrice,
          has_gift: hasGift,
          created_at: Date.now(),
        };
        sessionStorage.setItem("pending_order", JSON.stringify(pending));
        navigate("/confirm");
        return;
      }

      if (hasGift && orderId) {
        navigate(`/gift?order_id=${encodeURIComponent(orderId)}&product_id=${encodeURIComponent(productId || "")}`);
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error("Order creation failed:", err);
      setSubmitError("حدث خطأ أثناء إرسال الطلب، حاول مرة أخرى");
    } finally {
      setSubmitting(false);
    }
  }, [validate, submitting, fullName, phone, city, totalPrice, productId, productName, quantity, unitPrice]);

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto animate-scale-in" dir="rtl">
        <div className="bg-card rounded-2xl shadow-xl p-8 text-center space-y-5 border border-border">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">تم تأكيد طلبك بنجاح! 🎉</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            شكرًا لك {fullName}! سيتم التواصل معك على الرقم {phone} لتأكيد الطلب والتوصيل.
          </p>
          <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">المنتج</span>
              <span className="font-semibold text-foreground">{productName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الكمية</span>
              <span className="font-semibold text-foreground">{quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الإجمالي</span>
              <span className="font-bold text-foreground">{totalPrice} {cs}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">طريقة الدفع: الدفع عند الاستلام</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in" dir="rtl">
      <div className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-l from-foreground to-foreground/90 px-6 py-6 text-center space-y-2">
          <h2 className="text-xl md:text-2xl font-bold text-primary-foreground leading-relaxed">
            أدخل معلوماتك لإتمام الطلب
          </h2>
          <p className="text-primary-foreground/70 text-sm">
            الدفع عند الاستلام - توصيل سريع
          </p>
        </div>

        {/* Product summary */}
        {productImage && (
          <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-muted/30">
            <img src={productImage} alt={productName} className="w-16 h-16 rounded-xl object-cover border border-border" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{productName}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-base font-bold text-foreground">{unitPrice} {cs}</span>
                {compareAtPrice && compareAtPrice > unitPrice && (
                  <span className="text-xs text-muted-foreground line-through">{compareAtPrice} {cs}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">الاسم الكامل *</label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setErrors((er) => ({ ...er, fullName: "" })); }}
                placeholder="أدخل اسمك الكامل"
                className="w-full h-12 rounded-xl border border-input bg-background pr-10 pl-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all"
                style={{ fontSize: "16px" }}
              />
            </div>
            {errors.fullName && <p className="text-destructive text-xs font-medium animate-fade-in">{errors.fullName}</p>}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">رقم الهاتف *</label>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setErrors((er) => ({ ...er, phone: "" })); }}
                placeholder="05XXXXXXXX"
                dir="ltr"
                className="w-full h-12 rounded-xl border border-input bg-background pr-10 pl-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all text-right"
                style={{ fontSize: "16px" }}
              />
            </div>
            {errors.phone && <p className="text-destructive text-xs font-medium animate-fade-in">{errors.phone}</p>}
          </div>

          {/* City */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">المدينة / العنوان</label>
            <div className="relative">
              <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="اختياري - اكتب اسم مدينتك"
                className="w-full h-12 rounded-xl border border-input bg-background pr-10 pl-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all"
                style={{ fontSize: "16px" }}
              />
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">الكمية</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-xl border border-input bg-background flex items-center justify-center hover:bg-muted transition-colors"
              >
                <Minus className="w-4 h-4 text-foreground" />
              </button>
              <span className="w-12 text-center text-lg font-bold text-foreground">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-10 h-10 rounded-xl border border-input bg-background flex items-center justify-center hover:bg-muted transition-colors"
              >
                <Plus className="w-4 h-4 text-foreground" />
              </button>
              <div className="flex-1 text-left">
                <span className="text-lg font-bold text-foreground">{totalPrice} {cs}</span>
              </div>
            </div>
          </div>

          {/* Urgency */}
          <div className="bg-destructive/10 rounded-xl px-4 py-2.5 text-center">
            <p className="text-destructive text-sm font-bold animate-pulse">🔥 بقيت كميات محدودة!</p>
          </div>

          {/* Submit Error */}
          {submitError && (
            <div className="bg-destructive/10 rounded-xl px-4 py-3 text-center">
              <p className="text-destructive text-sm font-medium">{submitError}</p>
              <button
                onClick={handleSubmit}
                className="text-destructive text-xs underline mt-1 hover:no-underline"
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          {/* CTA Button */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full h-14 rounded-xl font-bold text-base text-destructive-foreground bg-destructive hover:bg-destructive/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جارٍ إرسال الطلب...</span>
              </>
            ) : (
              "تأكيد الطلب الآن"
            )}
          </button>

          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="flex flex-col items-center gap-1.5 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Package className="w-5 h-5 text-foreground/70" />
              </div>
              <span className="text-[11px] text-muted-foreground font-medium leading-tight">الدفع عند<br />الاستلام</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Truck className="w-5 h-5 text-foreground/70" />
              </div>
              <span className="text-[11px] text-muted-foreground font-medium leading-tight">توصيل<br />سريع</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-foreground/70" />
              </div>
              <span className="text-[11px] text-muted-foreground font-medium leading-tight">ضمان<br />الجودة</span>
            </div>
          </div>

          {/* Testimonial */}
          <div className="border border-border rounded-xl px-4 py-3 bg-muted/20">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              ⭐⭐⭐⭐⭐ "طلبت ووصلني بسرعة، المنتج ممتاز والدفع عند الاستلام مريح جدًا" — <span className="font-semibold text-foreground">أم نورة</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodOrderForm;
