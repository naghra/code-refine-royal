import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/useCurrency";
import { CurrencySymbol } from "@/components/admin/CurrencySymbol";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import { notify } from "@/lib/notify";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2, Search, Phone, MapPin, RefreshCw, ShoppingBag, TrendingUp, Calendar, Percent, SlidersHorizontal, X,
  Send, Download, Gift, Package, Flame, Sparkles, Loader2, Eye, Hash, Home,
} from "lucide-react";

type ConfirmedOrder = {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  city: string | null;
  address: string | null;
  total: number;
  subtotal: number;
  shipping_cost: number;
  status: string;
  created_at: string;
  confirmed_at: string | null;
  lead_score: number | null;
  lead_quality: string | null;
  gift_name: string | null;
  gift_sku: string | null;
  notes: string | null;
  cod_network_status: string | null;
  cod_network_lead_id: string | null;
};

type OrderItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

const CURRENCY_COUNTRY_MAP: Record<string, string> = {
  SAR: "KSA", AED: "ARE", KWD: "KWT", BHD: "BHR", QAR: "QAT",
  OMR: "OMN", EGP: "EGY", USD: "USA", EUR: "DEU", GBP: "GBR",
  MAD: "MAR", TRY: "TUR", MRU: "MRT",
};

const RIYADH_TZ = "Asia/Riyadh";

const formatRiyadh = (iso: string | null) => {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      timeZone: RIYADH_TZ,
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

type DatePreset = "today" | "7d" | "30d" | "all" | "custom";

// Convert a local "YYYY-MM-DD" date input value into an ISO timestamp
// representing the start/end of that day in Riyadh time (UTC+3).
const riyadhDayBoundsISO = (dateStr: string, end = false) => {
  // Riyadh is UTC+3 (no DST). Start of day = 00:00 +03:00 → 21:00 UTC previous day.
  const t = end ? "23:59:59.999" : "00:00:00.000";
  return new Date(`${dateStr}T${t}+03:00`).toISOString();
};

const todayInRiyadh = () => {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: RIYADH_TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  return fmt.format(new Date()); // YYYY-MM-DD
};

const addDaysRiyadh = (days: number) => {
  const today = todayInRiyadh();
  const d = new Date(`${today}T00:00:00+03:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: RIYADH_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
};

export default function AdminConfirmedOrders() {
  const { currency } = useCurrency();
  const cs = currency.symbol;
  const cc = currency.code;
  const [orders, setOrders] = useState<ConfirmedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [responseStats, setResponseStats] = useState({ confirmed: 0, rejected: 0, no_response: 0 });
  const [preset, setPreset] = useState<DatePreset>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [codSettings, setCodSettings] = useState<{ enabled: boolean; api_token: string; default_country: string; default_city: string } | null>(null);
  const [detailsOrder, setDetailsOrder] = useState<ConfirmedOrder | null>(null);
  const [detailsItems, setDetailsItems] = useState<OrderItem[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Load CodNetwork settings
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "cod_network")
        .maybeSingle();
      if (data?.value) {
        const v = data.value as any;
        if (v.enabled && v.api_token) setCodSettings(v);
      }
    })();
  }, []);

  const fetchOrders = async () => {
    setRefreshing(true);

    // Resolve date range (Riyadh-day → ISO bounds)
    const fromISO = dateFrom ? riyadhDayBoundsISO(dateFrom, false) : null;
    const toISO = dateTo ? riyadhDayBoundsISO(dateTo, true) : null;

    let listQ = supabase
      .from("orders")
      .select("id, order_number, customer_name, customer_phone, city, address, total, subtotal, shipping_cost, status, created_at, confirmed_at, confirmation_response, lead_score, lead_quality, gift_name, gift_sku, notes, cod_network_status, cod_network_lead_id")
      .eq("confirmation_response", "confirmed")
      .order("confirmed_at", { ascending: false, nullsFirst: false })
      .limit(500);
    if (fromISO) listQ = listQ.gte("confirmed_at", fromISO);
    if (toISO) listQ = listQ.lte("confirmed_at", toISO);

    const buildCount = (resp: string) => {
      // Use created_at for "no_response" (no confirmed_at), confirmed_at otherwise.
      const dateCol = resp === "confirmed" || resp === "rejected" ? "confirmed_at" : "created_at";
      let q = supabase.from("orders").select("id", { count: "exact", head: true }).eq("confirmation_response", resp);
      if (fromISO) q = q.gte(dateCol, fromISO);
      if (toISO) q = q.lte(dateCol, toISO);
      return q;
    };

    const [{ data, error }, confirmedRes, rejectedRes, noRespRes] = await Promise.all([
      listQ,
      buildCount("confirmed"),
      buildCount("rejected"),
      buildCount("no_response"),
    ]);
    if (!error && data) setOrders(data as any);
    setResponseStats({
      confirmed: confirmedRes.count || 0,
      rejected: rejectedRes.count || 0,
      no_response: noRespRes.count || 0,
    });
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  const applyPreset = (p: DatePreset) => {
    setPreset(p);
    if (p === "all") { setDateFrom(""); setDateTo(""); return; }
    if (p === "today") {
      const t = todayInRiyadh();
      setDateFrom(t); setDateTo(t); return;
    }
    if (p === "7d") { setDateFrom(addDaysRiyadh(-6)); setDateTo(todayInRiyadh()); return; }
    if (p === "30d") { setDateFrom(addDaysRiyadh(-29)); setDateTo(todayInRiyadh()); return; }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) =>
      String(o.order_number).includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.customer_phone?.toLowerCase().includes(q) ||
      (o.city || "").toLowerCase().includes(q)
    );
  }, [orders, search]);

  const stats = useMemo(() => {
    const total = orders.reduce((s, o) => s + Number(o.total || 0), 0);
    const today = orders.filter((o) => {
      const d = new Date(o.confirmed_at || o.created_at);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length;
    return { count: orders.length, total, today };
  }, [orders]);

  const promptedTotal = responseStats.confirmed + responseStats.rejected + responseStats.no_response;
  const confirmRate = promptedTotal > 0 ? (responseStats.confirmed / promptedTotal) * 100 : 0;

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" dir="rtl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #10b981, #059669)",
              boxShadow: "0 8px 24px -8px rgba(16,185,129,0.5)",
            }}>
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">الطلبات المؤكدة</h1>
            <p className="text-sm text-muted-foreground">الطلبات التي أكّدها العملاء بأنفسهم</p>
          </div>
        </div>
        <Button
          onClick={fetchOrders}
          disabled={refreshing}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: ShoppingBag, label: "إجمالي المؤكدة", value: stats.count, color: "from-emerald-500 to-teal-600" },
          { icon: TrendingUp, label: "إجمالي المبيعات", value: stats.total, isMoney: true, color: "from-violet-500 to-indigo-600" },
          { icon: Calendar, label: "مؤكدة اليوم", value: stats.today, color: "from-amber-500 to-orange-600" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-2xl p-5 border border-border shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-foreground">
                  {s.isMoney ? (
                    <>
                      {Number(s.value).toLocaleString()} <CurrencySymbol code={cc} symbol={cs} className="text-base" />
                    </>
                  ) : (
                    Number(s.value).toLocaleString()
                  )}
                </p>
              </div>
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </motion.div>
        ))}

        {/* Confirmation Rate Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-2xl p-5 border border-border shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">نسبة التأكيد</p>
              <p className="text-2xl font-bold text-foreground">
                {confirmRate.toFixed(1)}<span className="text-base text-muted-foreground">%</span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
              <Percent className="w-5 h-5 text-white" />
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${confirmRate}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-gradient-to-l from-emerald-500 to-teal-500"
            />
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {responseStats.confirmed} مؤكد من {promptedTotal} طلب ظهرت لهم رسالة التأكيد
          </p>
          <div className="flex items-center gap-3 mt-2 text-[10px]">
            <span className="inline-flex items-center gap-1 text-emerald-600">
              ● مؤكد {responseStats.confirmed}
            </span>
            <span className="inline-flex items-center gap-1 text-destructive">
              ● رفض {responseStats.rejected}
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              ● بدون رد {responseStats.no_response}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Search + Filter */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث برقم الطلب، الاسم، الجوال، المدينة..."
            className="pr-10"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2 h-10 relative">
              <SlidersHorizontal className="w-4 h-4" />
              فلترة
              {(dateFrom || dateTo) && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[320px] p-4" dir="rtl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground">فلترة حسب التاريخ</h4>
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => applyPreset("all")}
                  className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> مسح
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {([
                { k: "all", label: "الكل" },
                { k: "today", label: "اليوم" },
                { k: "7d", label: "آخر 7 أيام" },
                { k: "30d", label: "آخر 30 يوم" },
              ] as { k: DatePreset; label: string }[]).map((p) => (
                <Button
                  key={p.k}
                  size="sm"
                  variant={preset === p.k ? "default" : "outline"}
                  onClick={() => applyPreset(p.k)}
                  className="h-8 text-xs"
                >
                  {p.label}
                </Button>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">من تاريخ</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPreset("custom"); }}
                  className="h-9"
                  dir="ltr"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">إلى تاريخ</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPreset("custom"); }}
                  className="h-9"
                  dir="ltr"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-14 h-14 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">لا توجد طلبات مؤكدة بعد</p>
            <p className="text-xs text-muted-foreground mt-1">
              ستظهر هنا الطلبات التي يضغط فيها العملاء على زر "تأكيد طلبي"
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">#</TableHead>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">الجوال</TableHead>
                  <TableHead className="text-right">المدينة</TableHead>
                  <TableHead className="text-right">الإجمالي</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">وقت التأكيد</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => (
                  <TableRow key={o.id} className="hover:bg-muted/40">
                    <TableCell className="font-mono text-xs">#{o.order_number}</TableCell>
                    <TableCell className="font-semibold">{o.customer_name}</TableCell>
                    <TableCell>
                      <a
                        href={`tel:${o.customer_phone}`}
                        className="inline-flex items-center gap-1 text-sm text-foreground hover:text-primary"
                        dir="ltr"
                      >
                        <Phone className="w-3 h-3" />
                        {o.customer_phone}
                      </a>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {o.city ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {o.city}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="font-bold">
                      {Number(o.total).toLocaleString()} <CurrencySymbol code={cc} symbol={cs} className="text-xs" />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        مؤكد
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatRiyadh(o.confirmed_at || o.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}