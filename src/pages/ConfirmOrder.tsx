import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Clock, Loader2, ShieldAlert, Package, Phone, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/useCurrency";

interface PendingOrder {
  order_id: string;
  customer_name: string;
  customer_phone: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  has_gift: boolean;
  created_at: number;
}

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

const ConfirmOrder = () => {
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const cs = currency.symbol;
  const [pending, setPending] = useState<PendingOrder | null>(null);
  const [ready, setReady] = useState<"yes" | "no" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [remaining, setRemaining] = useState(TIMEOUT_MS);

  useEffect(() => {
    const raw = sessionStorage.getItem("pending_order");
    if (!raw) {
      navigate("/");
      return;
    }
    try {
      const parsed: PendingOrder = JSON.parse(raw);
      const age = Date.now() - parsed.created_at;
      if (age > TIMEOUT_MS) {
        sessionStorage.removeItem("pending_order");
        setExpired(true);
        return;
      }
      setPending(parsed);
      setRemaining(TIMEOUT_MS - age);
    } catch {
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    if (!pending || success) return;
    const interval = setInterval(() => {
      setRemaining((r) => {
        const next = r - 1000;
        if (next <= 0) {
          sessionStorage.removeItem("pending_order");
          setExpired(true);
          clearInterval(interval);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pending, success]);

  const handleConfirm = async () => {
    if (!pending || ready !== "yes" || submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const { data, error: fnErr } = await supabase.functions.invoke("confirm-order", {
        body: { order_id: pending.order_id },
      });

      if (fnErr) throw fnErr;
      if (!data?.success) throw new Error(data?.error || "Confirmation failed");

      sessionStorage.removeItem("pending_order");

      if (pending.has_gift && pending.order_id) {
        navigate(`/gift?order_id=${encodeURIComponent(pending.order_id)}&product_id=${encodeURIComponent(pending.product_id || "")}`);
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error("Confirm order failed:", err);
      setError("حدث خطأ أثناء تأكيد الطلب، حاول مرة أخرى");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-muted/30" dir="rtl">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-xl p-8 text-center space-y-4 border border-border">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Clock className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold">انتهت مدة التأكيد</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            مرت أكثر من 10 دقائق على إدخال بياناتك. يمكنك العودة وإعادة المحاولة.
          </p>
          <button
            onClick={() => navigate("/")}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors"
          >
            العودة للمنتج
          </button>
        </div>
      </div>
    );
  }

  if (success && pending) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-muted/30" dir="rtl">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-xl p-8 text-center space-y-5 border border-border animate-scale-in">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold">تم تأكيد طلبك بنجاح! 🎉</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            شكرًا {pending.customer_name}! سيتم التواصل معك على {pending.customer_phone} خلال 48 ساعة.
          </p>
        </div>
      </div>
    );
  }

  if (!pending) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-muted/30" dir="rtl">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-l from-foreground to-foreground/90 px-6 py-6 text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-primary-foreground/10 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-primary-foreground">
            طلبك بانتظار التأكيد
          </h1>
          <p className="text-primary-foreground/70 text-sm leading-relaxed">
            تم استلام طلبك ولن يتم شحنه حتى تقوم بتأكيده الآن
          </p>
        </div>

        {/* Timer */}
        <div className="bg-destructive/5 border-b border-destructive/10 px-6 py-3 flex items-center justify-center gap-2">
          <Clock className="w-4 h-4 text-destructive" />
          <span className="text-sm font-bold text-destructive" dir="ltr">
            {formatTime(remaining)}
          </span>
          <span className="text-xs text-destructive/70">للتأكيد قبل إلغاء الطلب</span>
        </div>

        {/* Order summary */}
        <div className="px-6 py-5 space-y-3 border-b border-border">
          <h3 className="text-sm font-bold text-foreground mb-2">ملخص طلبك</h3>

          <div className="flex items-center gap-3 bg-muted/40 rounded-xl p-3">
            <User className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground">الاسم</p>
              <p className="text-sm font-semibold text-foreground truncate">{pending.customer_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-muted/40 rounded-xl p-3">
            <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground">الهاتف</p>
              <p className="text-sm font-semibold text-foreground" dir="ltr">{pending.customer_phone}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-muted/40 rounded-xl p-3">
            {pending.product_image ? (
              <img src={pending.product_image} alt="" className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <Package className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground">المنتج</p>
              <p className="text-sm font-semibold text-foreground truncate">{pending.product_name}</p>
              <p className="text-xs text-muted-foreground">الكمية: {pending.quantity} • الإجمالي: {pending.total} {cs}</p>
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm font-bold text-foreground text-center">
            هل أنت مستعد لاستلام طلبك خلال 48 ساعة؟
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setReady("yes")}
              className={`h-12 rounded-xl font-bold text-sm transition-all border-2 ${
                ready === "yes"
                  ? "bg-green-500 text-white border-green-500 shadow-md scale-[1.02]"
                  : "bg-background text-foreground border-border hover:border-green-300"
              }`}
            >
              ✅ نعم، مستعد
            </button>
            <button
              onClick={() => setReady("no")}
              className={`h-12 rounded-xl font-bold text-sm transition-all border-2 ${
                ready === "no"
                  ? "bg-destructive text-destructive-foreground border-destructive shadow-md scale-[1.02]"
                  : "bg-background text-foreground border-border hover:border-destructive/30"
              }`}
            >
              ❌ لا، ليس الآن
            </button>
          </div>

          {ready === "no" && (
            <div className="bg-destructive/10 rounded-xl p-3 text-center animate-fade-in">
              <p className="text-xs text-destructive font-medium">
                نعتذر، نقوم بالشحن فقط للعملاء المستعدين للاستلام خلال 48 ساعة. يمكنك العودة لاحقاً.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 rounded-xl px-4 py-3 text-center">
              <p className="text-destructive text-sm font-medium">{error}</p>
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={ready !== "yes" || submitting}
            className="w-full h-14 rounded-xl font-bold text-base text-destructive-foreground bg-destructive hover:bg-destructive/90 shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جارٍ تأكيد الطلب...</span>
              </>
            ) : (
              "👉 تأكيد طلبي الآن"
            )}
          </button>

          <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
            ⚡ طلبك محفوظ لكن لن يُشحن حتى يتم التأكيد.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConfirmOrder;
