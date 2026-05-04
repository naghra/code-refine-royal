import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertCircle, Calendar, TrendingUp } from "lucide-react";
import { DASHBOARD_FIELDS, type SectionConfig } from "./sectionConfig";
import InvoicesView from "./InvoicesView";

interface Props {
  section: SectionConfig;
  apiToken: string;
}

type RangePreset = "today" | "yesterday" | "last7" | "this_month" | "last_month" | "all" | "custom";

function ymd(d: Date): string {
  // Riyadh (UTC+3) date as YYYY-MM-DD
  const r = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  return r.toISOString().slice(0, 10);
}

function rangeFor(preset: RangePreset, custom?: { from: string; to: string }) {
  const now = new Date();
  const today = ymd(now);
  const y = new Date(now); y.setUTCDate(y.getUTCDate() - 1);
  const seven = new Date(now); seven.setUTCDate(seven.getUTCDate() - 6);
  const monthStart = new Date(now); monthStart.setUTCDate(1);
  const lastMonthStart = new Date(monthStart); lastMonthStart.setUTCMonth(lastMonthStart.getUTCMonth() - 1);
  const lastMonthEnd = new Date(monthStart); lastMonthEnd.setUTCDate(0);
  switch (preset) {
    case "today": return { from: today, to: today };
    case "yesterday": return { from: ymd(y), to: ymd(y) };
    case "last7": return { from: ymd(seven), to: today };
    case "this_month": return { from: ymd(monthStart), to: today };
    case "last_month": return { from: ymd(lastMonthStart), to: ymd(lastMonthEnd) };
    case "all": return null;
    case "custom":
      if (custom?.from && custom?.to) return { from: custom.from, to: custom.to };
      return null;
  }
}

export default function SectionView({ section, apiToken }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);

  // Date range filter — only meaningful for dashboards.
  const supportsDateFilter =
    section.key === "confirmed_dashboard" || section.key === "delivered_dashboard";
  const [preset, setPreset] = useState<RangePreset>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const activeRange = useMemo(
    () => rangeFor(preset, { from: customFrom, to: customTo }),
    [preset, customFrom, customTo],
  );

  const cacheKey = useMemo(() => {
    const r = supportsDateFilter && activeRange ? `${activeRange.from}_${activeRange.to}` : "all";
    return `cod_net_cache::${section.key}::${r}`;
  }, [section.key, supportsDateFilter, activeRange]);

  const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

  const load = async (
    range: { from: string; to: string } | null = activeRange,
    opts: { force?: boolean } = {},
  ) => {
    if (!apiToken) {
      toast({ title: "أدخل API Token أولاً", variant: "destructive" });
      return;
    }
    const key = supportsDateFilter && range
      ? `cod_net_cache::${section.key}::${range.from}_${range.to}`
      : `cod_net_cache::${section.key}::all`;
    if (!opts.force) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Date.now() - parsed.t < CACHE_TTL_MS) {
            setData(parsed.data);
            setStatus(parsed.status ?? null);
            setError(null);
            return;
          }
        }
      } catch {}
    }
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        action: "get_section",
        section: section.key,
        api_token: apiToken,
      };
      if (supportsDateFilter && range) {
        body.query = `date_from=${range.from}&date_to=${range.to}`;
      }
      const res = await supabase.functions.invoke("cod-network-proxy", {
        body,
      });
      if (res.error) throw res.error;
      setStatus(res.data?.status || null);
      if (!res.data?.success) {
        const s = res.data?.status;
        let msg = `HTTP ${s || "ERR"}`;
        if (s === 401) msg += " — التوكن غير صالح أو منتهي. تحقق من API Token في الأعلى وأعد الحفظ.";
        else if (s === 403) msg += " — هذا القسم غير مفعّل لحسابك (يحتاج صلاحية إضافية من COD Network).";
        else if (s === 404) msg += " — المسار غير موجود في حسابك (قد يكون القسم غير مفعّل).";
        else msg += " — تعذّر جلب البيانات.";
        setError(msg);
        setData(null);
      } else {
        setData(res.data?.data);
        try {
          localStorage.setItem(
            key,
            JSON.stringify({ t: Date.now(), data: res.data?.data, status: res.data?.status ?? null }),
          );
        } catch {}
      }
    } catch (err: any) {
      setError(String(err?.message || err));
    }
    setLoading(false);
  };

  useEffect(() => {
    load(activeRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.key]);

  const Icon = section.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${section.gradient} flex items-center justify-center shadow-sm`}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-base font-bold text-foreground">{section.label}</p>
            <p className="text-xs text-muted-foreground">
              {section.kind === "stats" ? "إحصائيات اللوحة" : "قائمة بالعناصر من V2 API"}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(activeRange, { force: true })} disabled={loading}>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin ml-2" />
          ) : (
            <RefreshCw className="w-4 h-4 ml-2" />
          )}
          تحديث
        </Button>
      </div>

      {/* Date range filter (Confirmed / Delivered dashboards only) */}
      {supportsDateFilter && (
        <DateRangeFilter
          preset={preset}
          setPreset={setPreset}
          customFrom={customFrom}
          setCustomFrom={setCustomFrom}
          customTo={customTo}
          setCustomTo={setCustomTo}
          onApply={() => load(activeRange, { force: true })}
          onReset={() => {
            setPreset("today");
            setCustomFrom("");
            setCustomTo("");
            const r = rangeFor("today");
            load(r, { force: true });
          }}
          loading={loading}
        />
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      )}

      {/* Stats view (dashboards) */}
      {section.kind === "stats" && data && (
        <StatsGrid section={section} payload={data} />
      )}

      {/* List view */}
      {section.kind === "list" && data && (
        section.key === "invoices"
          ? <InvoicesView payload={data} />
          : <ListView section={section} payload={data} />
      )}
    </motion.div>
  );
}

// Per-card visual + meaning configuration. `denom` selects which field to use
// as 100% baseline so we can render a meaningful percentage on each card.
const CARD_META: Record<
  string,
  { accent: string; ring: string; bar: string; denom?: string; format?: "money" | "int" }
> = {
  // Confirmed Dashboard — % of total leads
  total_leads_count:                       { accent: "from-indigo-500 to-violet-600",  ring: "ring-indigo-500/30",  bar: "from-indigo-500 to-violet-500" },
  total_new_leads_count:                   { accent: "from-sky-500 to-blue-600",       ring: "ring-sky-500/30",     bar: "from-sky-500 to-blue-500",       denom: "total_leads_count" },
  total_confirmed_leads_count:             { accent: "from-emerald-500 to-teal-600",   ring: "ring-emerald-500/30", bar: "from-emerald-500 to-teal-500",   denom: "total_leads_count" },
  total_processing_leads_count:            { accent: "from-amber-500 to-orange-600",   ring: "ring-amber-500/30",   bar: "from-amber-500 to-orange-500",   denom: "total_leads_count" },
  total_no_reply_leads_count:              { accent: "from-yellow-500 to-amber-600",   ring: "ring-yellow-500/30",  bar: "from-yellow-500 to-amber-500",   denom: "total_leads_count" },
  total_canceled_leads_count:              { accent: "from-rose-500 to-red-600",       ring: "ring-rose-500/30",    bar: "from-rose-500 to-red-500",       denom: "total_leads_count" },
  total_wrong_leads_count:                 { accent: "from-pink-500 to-rose-600",      ring: "ring-pink-500/30",    bar: "from-pink-500 to-rose-500",      denom: "total_leads_count" },
  total_expired_leads_count:               { accent: "from-slate-500 to-slate-700",    ring: "ring-slate-500/30",   bar: "from-slate-500 to-slate-600",    denom: "total_leads_count" },
  total_call_later_scheduled_leads_count:  { accent: "from-fuchsia-500 to-purple-600", ring: "ring-fuchsia-500/30", bar: "from-fuchsia-500 to-purple-500", denom: "total_leads_count" },
  // Delivered Dashboard
  shipped_orders:    { accent: "from-sky-500 to-blue-600",     ring: "ring-sky-500/30",     bar: "from-sky-500 to-blue-500" },
  processing_orders: { accent: "from-amber-500 to-orange-600", ring: "ring-amber-500/30",   bar: "from-amber-500 to-orange-500", denom: "shipped_orders" },
  delivered_orders:  { accent: "from-emerald-500 to-teal-600", ring: "ring-emerald-500/30", bar: "from-emerald-500 to-teal-500", denom: "shipped_orders" },
  returned_orders:   { accent: "from-rose-500 to-red-600",     ring: "ring-rose-500/30",    bar: "from-rose-500 to-red-500",     denom: "shipped_orders" },
  sales:             { accent: "from-emerald-500 to-green-600",ring: "ring-emerald-500/30", bar: "from-emerald-500 to-green-500", format: "money" },
  profits:           { accent: "from-teal-500 to-emerald-600", ring: "ring-teal-500/30",    bar: "from-teal-500 to-emerald-500", format: "money", denom: "sales" },
  shipping_cost:     { accent: "from-orange-500 to-red-500",   ring: "ring-orange-500/30",  bar: "from-orange-500 to-red-500",   format: "money", denom: "sales" },
  delivery_cost:     { accent: "from-amber-500 to-orange-600", ring: "ring-amber-500/30",   bar: "from-amber-500 to-orange-500", format: "money", denom: "sales" },
  vat:               { accent: "from-violet-500 to-purple-600",ring: "ring-violet-500/30",  bar: "from-violet-500 to-purple-500", format: "money", denom: "sales" },
  cod_fees:          { accent: "from-fuchsia-500 to-pink-600", ring: "ring-fuchsia-500/30", bar: "from-fuchsia-500 to-pink-500", format: "money", denom: "sales" },
};

type CardMeta = { accent: string; ring: string; bar: string; denom?: string; format?: "money" | "int" };
const DEFAULT_META: CardMeta = {
  accent: "from-slate-500 to-slate-700",
  ring: "ring-slate-500/20",
  bar: "from-slate-500 to-slate-600",
};

function num(v: any): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function StatsGrid({ section, payload }: { section: SectionConfig; payload: any }) {
  const fields = DASHBOARD_FIELDS[section.key] || [];
  const root = payload?.data ?? payload ?? {};

  // Hero card = first field (Total leads / Shipped orders) — full width banner.
  const [hero, ...rest] = fields;
  const heroValue = hero ? num(root?.[hero.key]) : 0;
  const heroMeta = (hero && CARD_META[hero.key]) || DEFAULT_META;

  return (
    <div className="space-y-4">
      {/* HERO */}
      {hero && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${heroMeta.accent} text-white shadow-xl`}
        >
          {/* Decorative blobs */}
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute -bottom-20 -left-10 w-64 h-64 rounded-full bg-black/20 blur-3xl" />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/70 font-semibold">
                {hero.label}
              </p>
              <p className="text-5xl md:text-6xl font-black tabular-nums mt-2 drop-shadow-sm">
                {formatValue(heroValue, CARD_META[hero.key]?.format)}
              </p>
              <p className="text-xs text-white/70 mt-2 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                إجمالي الفترة المحددة • UTC+3
              </p>
            </div>
            <div className="hidden md:flex w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm items-center justify-center ring-1 ring-white/30">
              <section.icon className="w-10 h-10 text-white" />
            </div>
          </div>
        </motion.div>
      )}

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {rest.map((f, i) => {
          const meta = CARD_META[f.key] || DEFAULT_META;
          const value = num(root?.[f.key]);
          const denomVal = meta.denom ? num(root?.[meta.denom]) : 0;
          const pct = denomVal > 0 ? Math.min(100, (value / denomVal) * 100) : null;
          return (
            <motion.div
              key={f.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i }}
              whileHover={{ y: -3 }}
              className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-lg hover:ring-2 ${meta.ring} transition-all`}
            >
              {/* corner gradient glow */}
              <div
                className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${meta.accent} opacity-20 blur-2xl group-hover:opacity-40 transition-opacity`}
              />
              {/* accent stripe */}
              <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${meta.bar}`} />

              <div className="relative flex items-start justify-between gap-2">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide leading-tight">
                  {f.label}
                </p>
                {pct !== null && (
                  <span
                    className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white bg-gradient-to-br ${meta.bar} shadow-sm`}
                  >
                    {pct.toFixed(1)}%
                  </span>
                )}
              </div>

              <p className="relative text-3xl font-black text-foreground tabular-nums mt-2 leading-none">
                {formatValue(value, meta.format)}
              </p>

              {/* Progress bar */}
              <div className="relative mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct ?? 0}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 + 0.04 * i }}
                  className={`h-full rounded-full bg-gradient-to-r ${meta.bar}`}
                />
              </div>

              {pct !== null ? (
                <p className="relative text-[10px] text-muted-foreground mt-1.5">
                  من {DASHBOARD_FIELDS[section.key]?.find((x) => x.key === meta.denom)?.label || "الإجمالي"}
                </p>
              ) : (
                <p className="relative text-[10px] text-muted-foreground mt-1.5 opacity-0">.</p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function formatValue(v: number, format?: "money" | "int"): string {
  if (format === "money") {
    return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (Number.isInteger(v)) return v.toLocaleString("en-US");
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ListView({ section, payload }: { section: SectionConfig; payload: any }) {
  const items: any[] = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload)
    ? payload
    : [];
  const total =
    payload?.meta?.pagination?.total ??
    payload?.meta?.total ??
    payload?.data?.total ??
    items.length;

  if (items.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
        لا توجد بيانات في هذا القسم
      </div>
    );
  }

  // Pick a few useful columns dynamically (id + first 4 string/number fields).
  const sample = items[0] || {};
  const cols = pickColumns(section.key, sample);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          الإجمالي: <span className="font-bold text-foreground">{Number(total).toLocaleString("en-US")}</span>
          {" • "}يعرض {items.length}
        </p>
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                {cols.map((c) => (
                  <th
                    key={c}
                    className="text-right px-3 py-2 text-[11px] font-bold text-muted-foreground uppercase whitespace-nowrap"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((row, i) => (
                <tr
                  key={row.id || i}
                  className="border-t border-border hover:bg-muted/30 transition-colors"
                >
                  {cols.map((c) => (
                    <td key={c} className="px-3 py-2 text-foreground whitespace-nowrap">
                      {renderCell(row[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function pickColumns(sectionKey: string, sample: Record<string, any>): string[] {
  // Curated columns per section for clarity.
  const curated: Record<string, string[]> = {
    products: ["id", "sku", "name", "price", "currency", "status"],
    drop_products: ["id", "sku", "name", "price", "currency", "status"],
    marketplace_products: ["id", "sku", "name", "slug"],
    stocks: ["id", "sku", "name", "country", "quantity"],
    leads: ["id", "name", "phone", "country", "status", "created_at"],
    orders: ["id", "reference", "status", "total", "currency", "created_at"],
    source_requests: ["id", "reference", "status", "source_country", "created_at"],
    purchases: ["id", "reference", "product_name", "product_sku", "status", "created_at"],
    stores: ["id", "name", "url", "country", "created_at"],
    invoices: ["id", "reference", "status", "start_at", "end_at", "sub_total"],
    statistics: [
      "sku",
      "name",
      "total_lead_count",
      "confirmed_leads_count",
      "delivered_leads_count",
      "confirmed_lead_rate",
      "delivered_lead_rate",
    ],
  };
  const wanted = curated[sectionKey];
  if (wanted) return wanted.filter((c) => c in sample);
  // Fallback: first 6 keys.
  return Object.keys(sample).slice(0, 6);
}

function renderCell(v: any): string {
  if (v == null) return "—";
  if (typeof v === "object") {
    if ("label" in v) return String(v.label);
    if ("name" in v) return String(v.name);
    return JSON.stringify(v).slice(0, 60);
  }
  if (typeof v === "string" && v.length > 60) return v.slice(0, 60) + "…";
  if (typeof v === "number") return v.toLocaleString("en-US");
  return String(v);
}

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7", label: "Last 7 Days" },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "all", label: "All Time" },
];

function DateRangeFilter({
  preset,
  setPreset,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
  onApply,
  onReset,
  loading,
}: {
  preset: RangePreset;
  setPreset: (p: RangePreset) => void;
  customFrom: string;
  setCustomFrom: (v: string) => void;
  customTo: string;
  setCustomTo: (v: string) => void;
  onApply: () => void;
  onReset: () => void;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-3" dir="ltr">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => {
          const active = preset === p.key;
          return (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border transition-all ${
                active
                  ? "text-white border-transparent bg-gradient-to-br from-orange-400 to-orange-500 shadow-sm"
                  : "text-foreground/70 bg-background border-border hover:bg-muted"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              {p.label}
            </button>
          );
        })}

        {/* Custom range input */}
        <button
          onClick={() => setPreset("custom")}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
            preset === "custom"
              ? "text-foreground border-foreground/30 bg-muted"
              : "text-muted-foreground bg-background border-border hover:bg-muted"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <input
            type="date"
            value={customFrom}
            onChange={(e) => { setCustomFrom(e.target.value); setPreset("custom"); }}
            className="bg-transparent outline-none w-[110px] text-xs"
          />
          <span className="text-muted-foreground">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => { setCustomTo(e.target.value); setPreset("custom"); }}
            className="bg-transparent outline-none w-[110px] text-xs"
          />
        </button>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onReset}
          disabled={loading}
          className="bg-rose-500/90 hover:bg-rose-500 text-white border-transparent hover:text-white"
        >
          Reset
        </Button>
        <Button
          size="sm"
          onClick={onApply}
          disabled={loading || (preset === "custom" && (!customFrom || !customTo))}
          className="bg-gradient-to-br from-orange-400 to-orange-500 hover:brightness-110 text-white"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin ml-1.5" /> : null}
          Apply Filters
        </Button>
      </div>
    </div>
  );
}