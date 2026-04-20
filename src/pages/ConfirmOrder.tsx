import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Package,
  Sparkles,
  Truck,
  Gift,
  ShieldCheck,
  Zap,
  Users,
  Lock,
  PartyPopper,
  ChevronLeft,
  AlertTriangle,
} from "lucide-react";
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

type Answer = "yes" | "no" | null;

type QId = "ready" | "cash" | "available";

const QUESTIONS: {
  id: QId;
  q: string;
  emoji: string;
  weight: number;
  hint: string;
}[] = [
  { id: "ready", q: "🚚 هل أنت جاهز لاستلام الطلب خلال 48 ساعة؟", emoji: "🚚", weight: 30, hint: "نضمن لك أولوية الشحن للمؤهلين فقط" },
  { id: "cash", q: "💰 هل المبلغ متوفر عند الاستلام؟", emoji: "💰", weight: 30, hint: "للحفاظ على جودة الخدمة لعملائنا" },
  { id: "available", q: "📞 هل ستكون متاحًا للرد على الهاتف؟", emoji: "📞", weight: 20, hint: "نتواصل مرة واحدة فقط لتأكيد العنوان" },
];

const QUALIFY_THRESHOLD = 70;
const FAST_INTERACTION_MS = 25_000; // answering all 3 questions under 25s

const ConfirmOrder = () => {
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const cs = currency.symbol;

  const [pending, setPending] = useState<PendingOrder | null>(null);
  const [step, setStep] = useState(0); // 0..2 questions, 3 = evaluating, 4 = result
  const [answers, setAnswers] = useState<Record<string, Answer>>({
    ready: null,
    cash: null,
    available: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [remaining, setRemaining] = useState(TIMEOUT_MS);
  const recordedRef = useRef({ done: false });
  const startedAtRef = useRef<number>(Date.now());
  const [evaluating, setEvaluating] = useState(false);
  const [score, setScore] = useState(0);
  const [softExitId, setSoftExitId] = useState<QId | null>(null);
  const [showReadyModal, setShowReadyModal] = useState(true);
  const [showNoWarning, setShowNoWarning] = useState(false);

  // Live social proof counters
  const [confirmedToday, setConfirmedToday] = useState(124);
  const [livePulse, setLivePulse] = useState(0);

  useEffect(() => {
    const t1 = setInterval(() => {
      setConfirmedToday((n) => n + (Math.random() > 0.6 ? 1 : 0));
    }, 7000);
    const t2 = setInterval(() => setLivePulse((p) => p + 1), 9000);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
    };
  }, []);

  const recordResponse = async (
    orderId: string,
    response: "confirmed" | "rejected" | "no_response",
    extra?: { lead_score?: number; lead_quality?: "high_intent" | "warm_lead" },
  ) => {
    try {
      await supabase.functions.invoke("confirm-order", {
        body: { order_id: orderId, response, ...(extra || {}) },
      });
    } catch (e) {
      console.error("Failed to record confirmation response:", e);
    }
  };

  // Load pending order from session storage
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

  // Countdown
  useEffect(() => {
    if (!pending || success) return;
    const interval = setInterval(() => {
      setRemaining((r) => {
        const next = r - 1000;
        if (next <= 0) {
          sessionStorage.removeItem("pending_order");
          setExpired(true);
          clearInterval(interval);
          if (!recordedRef.current.done && pending?.order_id) {
            recordedRef.current.done = true;
            recordResponse(pending.order_id, "no_response");
          }
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pending, success]);

  // pagehide -> no_response (warm lead)
  useEffect(() => {
    const handler = () => {
      if (!recordedRef.current.done && pending?.order_id) {
        recordedRef.current.done = true;
        try {
          const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/confirm-order`;
          const blob = new Blob(
            [JSON.stringify({ order_id: pending.order_id, response: "no_response" })],
            { type: "application/json" },
          );
          navigator.sendBeacon?.(url, blob);
        } catch {}
      }
    };
    window.addEventListener("pagehide", handler);
    return () => window.removeEventListener("pagehide", handler);
  }, [pending]);

  const computeScore = (a: Record<string, Answer>, fast: boolean) => {
    let s = 0;
    QUESTIONS.forEach((q) => {
      if (a[q.id] === "yes") s += q.weight;
    });
    if (fast) s += 10;
    return s;
  };

  const qualified = score >= QUALIFY_THRESHOLD;
  const allYes = useMemo(
    () => Object.values(answers).every((a) => a === "yes"),
    [answers],
  );

  const finalizeFunnel = (finalAnswers: Record<string, Answer>) => {
    const elapsed = Date.now() - startedAtRef.current;
    const fast = elapsed <= FAST_INTERACTION_MS;
    const s = computeScore(finalAnswers, fast);
    setScore(s);
    setEvaluating(true);
    setStep(3);
    // Brief evaluation animation
    setTimeout(() => {
      setEvaluating(false);
      setStep(4);
      // If not qualified, mark warm lead immediately (do NOT send to call center)
      if (s < QUALIFY_THRESHOLD && pending?.order_id && !recordedRef.current.done) {
        recordedRef.current.done = true;
        recordResponse(pending.order_id, "rejected", {
          lead_score: s,
          lead_quality: "warm_lead",
        });
      }
    }, 1400);
  };

  const handleAnswer = (qid: QId, val: Answer) => {
    const next = { ...answers, [qid]: val };
    setAnswers(next);
    setTimeout(() => {
      // Step 1 ("ready") — soft-exit on "No": save warm lead and stop the flow
      if (qid === "ready" && val === "no") {
        setSoftExitId("ready");
        if (pending?.order_id && !recordedRef.current.done) {
          recordedRef.current.done = true;
          recordResponse(pending.order_id, "rejected", {
            lead_score: 0,
            lead_quality: "warm_lead",
          });
        }
        return;
      }
      // Move forward; finalize after the last question
      if (step < QUESTIONS.length - 1) {
        setStep((s) => s + 1);
      } else {
        finalizeFunnel(next);
      }
    }, 240);
  };

  const handleConfirm = async () => {
    if (!pending || !qualified || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("confirm-order", {
        body: {
          order_id: pending.order_id,
          response: "confirmed",
          lead_score: score,
          lead_quality: "high_intent",
        },
      });
      // supabase.functions.invoke throws FunctionsHttpError on non-2xx
      // and exposes the response on err.context. Try to parse it.
      if (fnErr) {
        let errMsg = (fnErr as any)?.message || "Confirmation failed";
        try {
          const ctx: Response | undefined = (fnErr as any)?.context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.clone().json().catch(() => null);
            if (body?.error) errMsg = String(body.error);
          }
        } catch {}
        throw new Error(errMsg);
      }
      if (!data?.success) throw new Error(data?.error || "Confirmation failed");
      recordedRef.current.done = true;
      sessionStorage.removeItem("pending_order");

      if (pending.has_gift && pending.order_id) {
        navigate(
          `/gift?order_id=${encodeURIComponent(pending.order_id)}&product_id=${encodeURIComponent(pending.product_id || "")}`,
        );
        return;
      }
      setSuccess(true);
    } catch (err) {
      console.error("Confirm order failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      const lower = msg.toLowerCase();
      if (lower.includes("not found") || lower.includes("404")) {
        sessionStorage.removeItem("pending_order");
        setError("انتهت صلاحية هذا الطلب. الرجاء إعادة الطلب من صفحة المنتج.");
      } else {
        setError("حدث خطأ بسيط، حاول مرة أخرى من فضلك");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ===== Loading =====
  if (!pending && !expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0b0d12] via-[#10131a] to-[#0b0d12]" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-[#b38a2e]" />
      </div>
    );
  }

  // ===== Expired =====
  if (expired) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#0b0d12] via-[#10131a] to-[#0b0d12]"
        dir="rtl"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-3xl p-8 text-center space-y-4 border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl"
        >
          <div className="w-20 h-20 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto">
            <Clock className="w-10 h-10 text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">انتهت مدة الحجز ⏳</h2>
          <p className="text-white/70 text-sm leading-relaxed">
            الكميات محدودة جدًا اليوم. ارجع للمنتج وأكد طلبك من جديد لتحجز نسختك.
          </p>
          <button
            onClick={() => navigate("/")}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#b38a2e] to-[#d4a84a] text-black font-bold hover:opacity-95 transition-all"
          >
            الرجوع لاختيار المنتج
          </button>
        </motion.div>
      </div>
    );
  }

  // ===== Success =====
  if (success && pending) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#0b0d12] via-[#10131a] to-[#0b0d12] relative overflow-hidden"
        dir="rtl"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#b38a2e]/10 blur-3xl" />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative w-full max-w-md rounded-3xl p-8 text-center space-y-5 border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: 360 }}
            transition={{ duration: 0.7, type: "spring" }}
            className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30"
          >
            <CheckCircle2 className="w-12 h-12 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white">تم تأكيد طلبك بنجاح! 🎉</h2>
          <p className="text-white/70 text-sm leading-relaxed">
            مرحبًا {pending.customer_name}! حصلت على أولوية الشحن السريع. سنتواصل معك على{" "}
            <span dir="ltr" className="font-mono text-[#d4a84a]">{pending.customer_phone}</span>
          </p>
          <div className="flex items-center justify-center gap-2 text-emerald-300 text-sm pt-2">
            <PartyPopper className="w-4 h-4" />
            <span>هديتك المجانية محجوزة لك ✨</span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!pending) return null;

  // Progress indicator: percent across the funnel (questions + evaluation + result)
  const totalSteps = QUESTIONS.length + 1; // +1 for result
  const progress = softExitId
    ? 100
    : step >= 4
    ? 100
    : step === 3
    ? 90
    : ((step + 1) / totalSteps) * 100;

  return (
    <div
      className="min-h-screen px-4 py-6 md:py-10 bg-gradient-to-br from-[#0b0d12] via-[#10131a] to-[#0b0d12] relative overflow-hidden"
      dir="rtl"
    >
      {/* Ambient gold glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 right-1/4 w-[28rem] h-[28rem] rounded-full bg-[#b38a2e]/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[28rem] h-[28rem] rounded-full bg-emerald-500/5 blur-[120px]" />
      </div>

      <div className="relative max-w-md mx-auto space-y-5">
        {/* ===== Step 1: Success Hook ===== */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2 pt-2"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#b38a2e]/15 border border-[#b38a2e]/30 text-[#d4a84a] text-[11px] font-semibold">
            <Sparkles className="w-3 h-3" />
            مؤهل للشحن السريع
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
            🎉 مبروك! طلبك مؤهل للشحن السريع
          </h1>
          <p className="text-white/70 text-sm leading-relaxed">
            🚚 سيتم تجهيز طلبك فور التأكيد + هديتك المجانية اليوم
          </p>
        </motion.div>

        {/* Urgency strip (positive framing) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-l from-amber-500/15 to-[#b38a2e]/10 border border-amber-400/20"
        >
          <Zap className="w-4 h-4 text-amber-300" />
          <span className="text-xs text-amber-100 font-semibold">
            ⏳ احجز أولوية الشحن خلال
          </span>
          <span className="text-sm font-bold text-amber-300 font-mono" dir="ltr">
            {formatTime(remaining)}
          </span>
        </motion.div>

        {/* ===== Step 2: Social Proof ===== */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-3 space-y-2"
        >
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-semibold">مباشر</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/60">
              <Users className="w-3.5 h-3.5" />
              <span>
                ⭐ <span className="text-white font-bold">{confirmedToday}</span> طلب تم تأكيده اليوم
              </span>
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={livePulse}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-[11px] text-white/50 flex items-center gap-1.5"
            >
              <span className="w-1 h-1 rounded-full bg-[#d4a84a]" />
              👤 عميل من {["الرياض", "جدة", "الدمام", "مكة", "أبها"][livePulse % 5]} أكد طلبه قبل دقائق
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* ===== Step 3: Product Summary Card ===== */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl p-4 shadow-2xl"
        >
          <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#b38a2e]/20 border border-[#b38a2e]/30 text-[10px] font-bold text-[#d4a84a]">
            <Lock className="w-3 h-3" />
            محجوز مؤقتًا
          </div>
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/5 border border-white/10 shrink-0 flex items-center justify-center">
              {pending.product_image ? (
                <img
                  src={pending.product_image}
                  alt={pending.product_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="w-8 h-8 text-white/40" />
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-[11px] text-white/50">المنتج</p>
              <p className="text-sm font-bold text-white truncate">{pending.product_name}</p>
              <div className="flex items-center gap-3 text-[11px] text-white/60">
                <span>الكمية: {pending.quantity}</span>
                <span className="text-[#d4a84a] font-bold text-sm">
                  {pending.total} {cs}
                </span>
              </div>
            </div>
          </div>
          {pending.has_gift && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-400/20 text-xs text-emerald-200">
              <Gift className="w-4 h-4" />
              <span>🎁 هدية مجانية ستحصل عليها مع طلبك</span>
            </div>
          )}
        </motion.div>

        {/* ===== Progress Bar ===== */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-white/50">
            <span>
              {softExitId
                ? "تم حفظ طلبك"
                : step >= 4
                ? qualified
                  ? "🟢 طلبك مؤهل"
                  : "اكتمل التقييم"
                : step === 3
                ? "🔄 جاري تقييم طلبك..."
                : `الخطوة ${step + 1} من ${totalSteps}`}
            </span>
            <span className="font-mono">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-l from-[#b38a2e] via-[#d4a84a] to-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* ===== Exclusive Qualification Banner ===== */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-gradient-to-br from-[#b38a2e]/10 to-emerald-500/5 border border-[#b38a2e]/20 p-4"
        >
          <p className="text-sm font-bold text-[#d4a84a] flex items-center gap-2 mb-2">
            🎁 فقط الطلبات المؤهلة تحصل على:
          </p>
          <ul className="space-y-1.5 text-xs text-white/80">
            <li className="flex items-center gap-2">
              <Truck className="w-3.5 h-3.5 text-emerald-300" />
              أولوية الشحن السريع
            </li>
            <li className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              تجهيز سريع خلال ساعات
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              ضمان توفر المنتج
            </li>
          </ul>
        </motion.div>

        {/* ===== Smart Filtering Funnel ===== */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-5 min-h-[260px]">
          <AnimatePresence mode="wait">
            {/* Soft exit on Step 1 "No" — saved as warm lead */}
            {softExitId && (
              <motion.div
                key="soft-exit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-4 py-2"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-[#b38a2e]/15 border border-[#b38a2e]/30 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-[#d4a84a]" />
                </div>
                <h3 className="text-lg font-bold text-white">🔒 يمكنك الاحتفاظ بطلبك وتأكيده لاحقاً</h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  حجزنا لك المنتج + الهدية المجانية ليوم كامل. ارجع متى ما كنت جاهزًا للاستلام.
                </p>
                <button
                  onClick={() => navigate("/")}
                  className="w-full h-12 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold border border-white/15 transition-all"
                >
                  استكشاف منتجات أخرى
                </button>
              </motion.div>
            )}

            {!softExitId && step < QUESTIONS.length && (
              <motion.div
                key={`q-${step}`}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div className="text-center space-y-2">
                  <div className="text-3xl">{QUESTIONS[step].emoji}</div>
                  <p className="text-base md:text-lg font-bold text-white leading-relaxed">
                    {QUESTIONS[step].q}
                  </p>
                  <p className="text-[11px] text-white/50">{QUESTIONS[step].hint}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleAnswer(QUESTIONS[step].id, "yes")}
                    className="group relative h-14 rounded-2xl font-bold text-sm text-white bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.03] active:scale-[0.97]"
                  >
                    ✅ نعم
                  </button>
                  <button
                    onClick={() => handleAnswer(QUESTIONS[step].id, "no")}
                    className="h-14 rounded-2xl font-semibold text-sm text-white/70 bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                  >
                    لا
                  </button>
                </div>
                <div className="flex items-center justify-center gap-1 pt-1">
                  {QUESTIONS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        i === step
                          ? "w-6 bg-[#d4a84a]"
                          : i < step
                          ? "w-3 bg-emerald-400"
                          : "w-3 bg-white/15"
                      }`}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Evaluating animation */}
            {!softExitId && step === 3 && evaluating && (
              <motion.div
                key="evaluating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center space-y-4 py-6"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
                  className="w-16 h-16 mx-auto rounded-full border-2 border-[#b38a2e]/30 border-t-[#d4a84a] flex items-center justify-center"
                >
                  <Sparkles className="w-6 h-6 text-[#d4a84a]" />
                </motion.div>
                <h3 className="text-base font-bold text-white">🔄 جاري تقييم طلبك...</h3>
                <p className="text-xs text-white/60">نتحقق من أهلية طلبك للشحن السريع</p>
              </motion.div>
            )}

            {/* Low quality result – warm lead saved, NOT sent to call center */}
            {!softExitId && step >= 4 && !qualified && (
              <motion.div
                key="low-quality"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-4 py-2"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/15 border border-amber-400/30 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-amber-300" />
                </div>
                <h3 className="text-lg font-bold text-white">⚠️ حالياً الطلب غير مؤهل للشحن السريع</h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  لا تقلق — حجزنا لك المنتج. راجعنا لاحقًا متى ما كنت جاهزًا تمامًا للاستلام.
                </p>
                <div className="text-[11px] text-white/40">نتيجة التقييم: {score}/100</div>
                <button
                  onClick={() => navigate("/")}
                  className="w-full h-12 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold border border-white/15 transition-all flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  🔒 احتفظ بالطلب وراجع لاحقاً
                </button>
              </motion.div>
            )}

            {/* High quality result – qualified, show CTA */}
            {!softExitId && step >= 4 && qualified && (
              <motion.div
                key="cta"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className="text-center space-y-2">
                  <motion.div
                    initial={{ rotate: -10, scale: 0.8 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ type: "spring" }}
                    className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30"
                  >
                    <ShieldCheck className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className="text-lg font-bold text-white">
                    🎉 طلبك مؤهل للشحن السريع
                  </h3>
                  <p className="text-xs text-emerald-300 font-semibold">
                    🟢 نتيجة التقييم: {score}/100
                  </p>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-400/20 rounded-xl px-4 py-2.5 text-center">
                    <p className="text-red-300 text-xs font-medium">{error}</p>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="relative w-full h-16 rounded-2xl font-extrabold text-base text-white bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 shadow-xl shadow-emerald-500/40 disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
                >
                  <span className="absolute inset-0 bg-white/20 blur-xl opacity-0 hover:opacity-100 transition-opacity" />
                  <span className="absolute inset-0 rounded-2xl ring-2 ring-emerald-300/40 animate-pulse pointer-events-none" />
                  <span className="relative flex items-center justify-center gap-2">
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        جارٍ التأكيد...
                      </>
                    ) : (
                      <>✅ نعم، أريد استلام طلبي الآن 🚀</>
                    )}
                  </span>
                </motion.button>

                {/* Step 6: Bonus Motivation */}
                <div className="rounded-2xl bg-gradient-to-br from-[#b38a2e]/10 to-emerald-500/5 border border-[#b38a2e]/20 p-4 space-y-2">
                  <p className="text-sm font-bold text-[#d4a84a] flex items-center gap-2">
                    🎁 عند التأكيد الآن ستحصل على:
                  </p>
                  <ul className="space-y-1.5 text-xs text-white/80">
                    <li className="flex items-center gap-2">
                      <Truck className="w-3.5 h-3.5 text-emerald-300" />
                      أولوية في الشحن السريع
                    </li>
                    <li className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                      تجهيز فوري خلال ساعات
                    </li>
                    <li className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                      ضمان توفر المنتج لك
                    </li>
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Back button between questions */}
          {step > 0 && step < QUESTIONS.length && (
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="mt-4 mx-auto flex items-center gap-1 text-[11px] text-white/40 hover:text-white/70 transition-colors"
            >
              <ChevronLeft className="w-3 h-3" />
              رجوع
            </button>
          )}
        </div>

        {/* Trust footer */}
        <p className="text-center text-[10px] text-white/30 leading-relaxed pt-2">
          🔒 بياناتك محمية ولن تستخدم إلا لتوصيل طلبك
        </p>
      </div>
    </div>
  );
};

export default ConfirmOrder;
