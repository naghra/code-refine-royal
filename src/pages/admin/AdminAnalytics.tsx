import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { db, clientFor, getAuthenticatedUserId } from "@/integrations/supabase/external";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useCurrency, CURRENCIES } from "@/hooks/useCurrency";
import { getFlagUrl } from "@/lib/currency-flags";
import { Skeleton } from "@/components/ui/skeleton";
import { CurrencySymbol } from "@/components/admin/CurrencySymbol";
import { FuturisticFullLoader, FuturisticSkeleton } from "@/components/admin/FuturisticLoader";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  BarChart3,
  Users,
  MapPin,
  Clock,
  Globe,
  CalendarIcon,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

// --- Animated Counter ---
function AnimatedCounter({ target, duration = 1500, prefix = "", suffix = "" }: { target: number; duration?: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(from + (target - from) * eased));
      if (progress < 1) ref.current = requestAnimationFrame(step);
    };
    ref.current = requestAnimationFrame(step);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [target, duration]);

  return <span>{prefix}{count.toLocaleString("en-US")}{suffix}</span>;
}

// --- Stat Card ---
function StatCard({ icon: Icon, label, value, prefix, suffix, currencyCode, currencySymbolText, gradient, delay }: {
  icon: React.ElementType; label: string; value: number; prefix?: string; suffix?: string;
  currencyCode?: string; currencySymbolText?: string;
  gradient: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 cursor-default transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
    >
      {/* Glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 0%, ${gradient} 0%, transparent 70%)`, opacity: 0 }} />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.06] transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 0%, ${gradient} 0%, transparent 70%)` }} />

      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${gradient})`, boxShadow: `0 4px 14px ${gradient.split(",")[0]}33` }}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold text-foreground inline-flex items-center gap-1">
        <AnimatedCounter target={value} prefix={prefix} suffix={suffix} />
        {currencyCode && currencySymbolText && (
          <CurrencySymbol code={currencyCode} symbol={currencySymbolText} iconSize="h-5 w-5" />
        )}
      </p>
    </motion.div>
  );
}

// --- Live Visitors ---
function LiveVisitorsCard({ delay }: { delay: number }) {
  const [visitors, setVisitors] = useState(23);

  useEffect(() => {
    async function fetchVisitors() {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("page_visits")
        .select("visitor_id")
        .gte("created_at", fiveMinAgo);

      if (data) {
        const unique = new Set(data.map(v => v.visitor_id));
        setVisitors(unique.size);
      }
    }

    fetchVisitors();
    const iv = setInterval(fetchVisitors, 15000);
    return () => clearInterval(iv);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-card/80 backdrop-blur-sm p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
        </span>
        <span className="text-sm font-medium text-emerald-600">مباشر</span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-5 h-5 text-emerald-500" />
        <p className="text-sm text-muted-foreground">الزوار الآن</p>
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={visitors}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="text-3xl font-bold text-foreground"
        >
          {visitors.toLocaleString("en-US")}
        </motion.p>
      </AnimatePresence>
      <p className="text-xs text-muted-foreground mt-2">يتم التحديث مباشرة</p>
    </motion.div>
  );
}

// --- Chart Card Wrapper ---
function ChartCard({ title, children, delay }: { title: string; children: React.ReactNode; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5"
    >
      <h3 className="text-base font-semibold text-foreground mb-4">{title}</h3>
      {children}
    </motion.div>
  );
}

// --- Recent Order Row ---
function OrderRow({ name, city, time, index }: { name: string; city: string; time: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      className="flex items-center gap-3 py-3 border-b border-border/30 last:border-0"
    >
      <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
        <ShoppingCart className="w-4 h-4 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span>{city}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
        <Clock className="w-3 h-3" />
        <span>{time}</span>
      </div>
    </motion.div>
  );
}

// --- Day names helper ---
const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const COUNTRY_NAME_AR: Record<string, string> = {
  "Saudi Arabia": "السعودية",
  "United Arab Emirates": "الإمارات",
  "Kuwait": "الكويت",
  "Bahrain": "البحرين",
  "Qatar": "قطر",
  "Oman": "عُمان",
  "Egypt": "مصر",
  "United States": "أمريكا",
  "United Kingdom": "بريطانيا",
  "Morocco": "المغرب",
  "Turkey": "تركيا",
  "Mauritania": "موريتانيا",
  "Tunisia": "تونس",
  "Jordan": "الأردن",
  "Iraq": "العراق",
  "Libya": "ليبيا",
  "Sudan": "السودان",
  "Algeria": "الجزائر",
  "Lebanon": "لبنان",
  "Yemen": "اليمن",
  "Palestine": "فلسطين",
  "Syria": "سوريا",
};

// Map ip_country to a currency code for display purposes
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  "Saudi Arabia": "SAR",
  "United Arab Emirates": "AED",
  "Kuwait": "KWD",
  "Bahrain": "BHD",
  "Qatar": "QAR",
  "Oman": "OMR",
  "Egypt": "EGP",
  "United States": "USD",
  "United Kingdom": "GBP",
  "Morocco": "MAD",
  "Turkey": "TRY",
  "Mauritania": "MRU",
  "Tunisia": "TND",
  "Jordan": "JOD",
  "Iraq": "IQD",
  "Libya": "LYD",
  "Sudan": "SDG",
  "Algeria": "DZD",
  "Lebanon": "LBP",
  "Yemen": "YER",
  "Syria": "SYP",
};

interface CountryStats {
  country: string;
  countryAr: string;
  totalOrders: number;
  totalRevenue: number;
  currencySymbol: string;
  currencyCode: string;
  flagUrl: string | null;
  percentage: number;
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

// --- Country Stats Card ---
function CountryStatsCard({ stat, index }: { stat: CountryStats; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {stat.flagUrl && (
            <div className="w-8 h-6 rounded-[3px] overflow-hidden shadow-sm border border-border/30 flex-shrink-0">
              <img src={stat.flagUrl} alt={stat.countryAr} className="w-full h-full object-cover" loading="lazy" />
            </div>
          )}
          <h4 className="font-semibold text-foreground">{stat.countryAr}</h4>
        </div>
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-accent/10 text-accent">
          {stat.percentage.toFixed(1)}%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">عدد الطلبات</p>
          <p className="text-xl font-bold text-foreground">
            <AnimatedCounter target={stat.totalOrders} />
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">الإيرادات</p>
          <p className="text-xl font-bold text-foreground inline-flex items-center gap-1">
            <AnimatedCounter target={stat.totalRevenue} />
            <CurrencySymbol code={stat.currencyCode} symbol={stat.currencySymbol} iconSize="h-4 w-4" />
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// --- Fetch function ---
// Paginated fetch: gets ALL rows by fetching in chunks of 1000
async function fetchAllRows<T = any>(
  queryBuilder: () => ReturnType<ReturnType<typeof supabase.from>['select']>
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  let allData: T[] = [];
  let page = 0;
  while (true) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await (queryBuilder() as any).range(from, to);
    if (error) { console.error("Paginated fetch error:", error); break; }
    if (!data || data.length === 0) break;
    allData = allData.concat(data as T[]);
    if (data.length < PAGE_SIZE) break;
    page++;
  }
  return allData;
}

async function fetchAnalyticsData(currencyCode: string) {
  const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;
  const nowRiyadh = new Date(Date.now() + RIYADH_OFFSET_MS);
  const startOfTodayRiyadh = new Date(Date.UTC(nowRiyadh.getUTCFullYear(), nowRiyadh.getUTCMonth(), nowRiyadh.getUTCDate()) - RIYADH_OFFSET_MS);
  const todayISO = startOfTodayRiyadh.toISOString();
  const last7 = getLast7Days();
  const weekStart = last7[0];

  const [countRes, todayData, weekData, recentRes, allOrdersData] = await Promise.all([
    db("orders").select("*", { count: "exact", head: true }),
    fetchAllRows(() => db("orders").select("total").gte("created_at", todayISO)),
    fetchAllRows(() => db("orders").select("total, created_at").gte("created_at", weekStart)),
    db("orders").select("customer_name, city, created_at").order("created_at", { ascending: false }).limit(5),
    fetchAllRows(() => db("orders").select("ip_country, total, created_at, order_items(product_id, products(currency_code, currency_enabled))")),
  ]);

  const totalOrders = countRes.count || 0;
  const todayOrders = todayData.length;
  const todayRevenue = todayData.reduce((s: number, o: any) => s + (o.total || 0), 0);
  const totalRevenue = allOrdersData.reduce((s: number, o: any) => s + (o.total || 0), 0);

  const dayMap: Record<string, { orders: number; revenue: number }> = {};
  last7.forEach(d => { dayMap[d] = { orders: 0, revenue: 0 }; });
  weekData.forEach((o: any) => {
    const dateKey = o.created_at.split("T")[0];
    if (dayMap[dateKey]) {
      dayMap[dateKey].orders++;
      dayMap[dateKey].revenue += o.total || 0;
    }
  });
  const dailyData = last7.map(d => ({
    day: dayNames[new Date(d).getDay()],
    orders: dayMap[d].orders,
    revenue: dayMap[d].revenue,
  }));

  const recentOrders = recentRes.data?.map(o => ({
    name: o.customer_name,
    city: o.city || "غير محدد",
    time: getTimeAgo(o.created_at),
  })) || [];

  return {
    stats: { todayOrders, todayRevenue, totalOrders, totalRevenue },
    dailyData,
    recentOrders,
    allOrdersRaw: allOrdersData,
  };
}

// --- Main Component ---
export default function AdminAnalytics() {
  const { currency } = useCurrency();
  const { toast } = useToast();
  const [loaderDone, setLoaderDone] = useState(false);
  const [countryTimePeriod, setCountryTimePeriod] = useState<"today" | "7days" | "30days" | "all" | "custom">("today");
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics", currency.code],
    queryFn: () => fetchAnalyticsData(currency.code),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: true,
  });

  const hasData = !!data;
  const stats = data?.stats || { todayOrders: 0, todayRevenue: 0, totalOrders: 0, totalRevenue: 0 };
  const recentOrders = data?.recentOrders || [];
  const dailyData = data?.dailyData || [];
  const allOrdersRaw = data?.allOrdersRaw || [];

  const { countryStats, isMultiCountry } = useMemo(() => {
    if (!allOrdersRaw.length) return { countryStats: [] as CountryStats[], isMultiCountry: false };

    const nowUtc = new Date();
    const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;
    const nowRiyadh = new Date(nowUtc.getTime() + RIYADH_OFFSET_MS);
    const startOfTodayRiyadh = new Date(Date.UTC(nowRiyadh.getUTCFullYear(), nowRiyadh.getUTCMonth(), nowRiyadh.getUTCDate()) - RIYADH_OFFSET_MS);
    const last7d = new Date(startOfTodayRiyadh.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(startOfTodayRiyadh.getTime() - 30 * 24 * 60 * 60 * 1000);

    const filtered = allOrdersRaw.filter((order: any) => {
      if (countryTimePeriod === "all") return true;
      const orderDate = new Date(order.created_at);
      if (countryTimePeriod === "today") return orderDate >= startOfTodayRiyadh;
      if (countryTimePeriod === "7days") return orderDate >= last7d;
      if (countryTimePeriod === "30days") return orderDate >= last30d;
      if (countryTimePeriod === "custom") {
        if (customDateRange.from && orderDate < customDateRange.from) return false;
        if (customDateRange.to) {
          const endOfDay = new Date(customDateRange.to);
          endOfDay.setHours(23, 59, 59, 999);
          if (orderDate > endOfDay) return false;
        }
        return !!(customDateRange.from);
      }
      return true;
    });

    const grouped: Record<string, { totalOrders: number; totalRevenue: number; currencyCode: string }> = {};
    for (const order of filtered) {
      const country = (order as any).ip_country || "غير محدد";
      let orderCurrency = currency.code;
      const items = (order as any).order_items;
      if (items && items.length > 0) {
        const product = items[0].products;
        if (product?.currency_enabled && product.currency_code) {
          orderCurrency = product.currency_code;
        }
      }
      if (!grouped[country]) {
        grouped[country] = { totalOrders: 0, totalRevenue: 0, currencyCode: orderCurrency };
      }
      grouped[country].totalOrders += 1;
      grouped[country].totalRevenue += (order as any).total || 0;
    }

    const countries = Object.keys(grouped);
    const hasMultiple = countries.length > 1 || (countries.length === 1 && countries[0] !== "Saudi Arabia" && countries[0] !== "غير محدد");

    if (hasMultiple) {
      const totalAllOrders = Object.values(grouped).reduce((s, g) => s + g.totalOrders, 0);
      const arr: CountryStats[] = Object.entries(grouped)
        .map(([country, d]) => {
          const currencyConfig = CURRENCIES.find(c => c.code === d.currencyCode);
          const currencyCodeForFlag = COUNTRY_TO_CURRENCY[country] || null;
          return {
            country,
            countryAr: COUNTRY_NAME_AR[country] || country,
            totalOrders: d.totalOrders,
            totalRevenue: d.totalRevenue,
            currencySymbol: currencyConfig?.symbol || currency.symbol,
            currencyCode: d.currencyCode,
            flagUrl: getFlagUrl(currencyCodeForFlag),
            percentage: totalAllOrders > 0 ? (d.totalOrders / totalAllOrders) * 100 : 0,
          };
        })
        .sort((a, b) => b.totalOrders - a.totalOrders);
      return { countryStats: arr, isMultiCountry: true };
    }
    return { countryStats: [] as CountryStats[], isMultiCountry: hasMultiple };
  }, [allOrdersRaw, countryTimePeriod, customDateRange, currency]);

  const handleLoaderComplete = useCallback(() => {
    setLoaderDone(true);
  }, []);

  // First-ever load only: show full loader when no cached data
  if (isLoading && !hasData && !loaderDone) {
    return <FuturisticFullLoader onComplete={handleLoaderComplete} />;
  }

  if (isLoading && !hasData) {
    return <FuturisticSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-6"
      >
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ background: "radial-gradient(ellipse at 70% 20%, hsl(250 80% 65%), transparent 60%)" }} />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(250 80% 65%), hsl(280 70% 55%))", boxShadow: "0 4px 16px hsla(250, 80%, 65%, 0.3)" }}>
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">إحصائيات المتجر</h1>
              <p className="text-sm text-muted-foreground">نظرة عامة على أداء متجرك</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>تحديث مباشر</span>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingCart} label="طلبات اليوم" value={stats.todayOrders}
          gradient="hsl(250 80% 65%), hsl(280 70% 55%)" delay={0.1} />
        <StatCard icon={DollarSign} label="إيرادات اليوم" value={stats.todayRevenue} currencyCode={currency.code} currencySymbolText={currency.symbol}
          gradient="hsl(160 70% 45%), hsl(140 60% 50%)" delay={0.15} />
        <StatCard icon={TrendingUp} label="إجمالي الطلبات" value={stats.totalOrders}
          gradient="hsl(340 75% 55%), hsl(20 80% 55%)" delay={0.2} />
        <StatCard icon={BarChart3} label="إجمالي الإيرادات" value={stats.totalRevenue} currencyCode={currency.code} currencySymbolText={currency.symbol}
          gradient="hsl(200 80% 55%), hsl(220 70% 60%)" delay={0.25} />
      </div>

      {/* Country Stats - shown when orders from multiple countries */}
      {isMultiCountry && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.28 }}
        >
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold text-foreground">إحصائيات حسب الدولة</h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/40">
                {([
                  { key: "today", label: "اليوم" },
                  { key: "7days", label: "7 أيام" },
                  { key: "30days", label: "30 يوم" },
                  { key: "all", label: "الكل" },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setCountryTimePeriod(key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                      countryTimePeriod === key
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 text-xs gap-1.5 rounded-lg border-border/40",
                      countryTimePeriod === "custom" && "bg-background shadow-sm border-accent/40 text-foreground",
                      countryTimePeriod !== "custom" && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {countryTimePeriod === "custom" && customDateRange.from ? (
                      customDateRange.to ? (
                        <span>
                          {format(customDateRange.from, "d MMM", { locale: ar })} - {format(customDateRange.to, "d MMM", { locale: ar })}
                        </span>
                      ) : (
                        format(customDateRange.from, "d MMM yyyy", { locale: ar })
                      )
                    ) : (
                      "تاريخ مخصص"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={customDateRange.from ? { from: customDateRange.from, to: customDateRange.to } : undefined}
                    onSelect={(range) => {
                      setCustomDateRange({ from: range?.from, to: range?.to });
                      if (range?.from) setCountryTimePeriod("custom");
                    }}
                    numberOfMonths={1}
                    className={cn("p-3 pointer-events-auto")}
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {countryStats.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {countryStats.map((stat, i) => (
                <CountryStatsCard key={stat.country} stat={stat} index={i} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              لا توجد طلبات في هذه الفترة
            </div>
          )}
        </motion.div>
      )}

      {/* Live Visitors + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <LiveVisitorsCard delay={0.3} />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="lg:col-span-2 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5"
        >
          <h3 className="text-base font-semibold text-foreground mb-3">آخر الطلبات</h3>
          <div>
            {recentOrders.map((o, i) => (
              <OrderRow key={i} {...o} index={i} />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="الطلبات اليومية" delay={0.4}>
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(250 80% 65%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(250 80% 65%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 90%)" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }} />
                <Area type="monotone" dataKey="orders" stroke="hsl(250 80% 65%)" fill="url(#orderGrad)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="الإيرادات اليومية" delay={0.45}>
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(340 75% 55%)" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(340 75% 55%)" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 90%)" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }} />
                <Bar dataKey="revenue" fill="url(#revGrad)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

// --- Skeleton ---
function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl lg:col-span-2" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} س`;
  return `منذ ${Math.floor(hours / 24)} ي`;
}
