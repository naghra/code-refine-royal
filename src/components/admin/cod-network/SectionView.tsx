import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertCircle, Calendar } from "lucide-react";
import { DASHBOARD_FIELDS, type SectionConfig } from "./sectionConfig";

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

  const load = async (range: { from: string; to: string } | null = activeRange) => {
    if (!apiToken) {
      toast({ title: "أدخل API Token أولاً", variant: "destructive" });
      return;
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
        <Button variant="outline" size="sm" onClick={() => load(activeRange)} disabled={loading}>
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
          onApply={() => load(activeRange)}
          onReset={() => {
            setPreset("today");
            setCustomFrom("");
            setCustomTo("");
            const r = rangeFor("today");
            load(r);
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
      {section.kind === "list" && data && <ListView section={section} payload={data} />}
    </motion.div>
  );
}

function StatsGrid({ section, payload }: { section: SectionConfig; payload: any }) {
  const fields = DASHBOARD_FIELDS[section.key] || [];
  const root = payload?.data ?? payload ?? {};
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {fields.map((f) => {
        const raw = root?.[f.key];
        const value = typeof raw === "number" ? raw : Number(raw) || 0;
        const display = Number.isInteger(value)
          ? value.toLocaleString("en-US")
          : value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return (
          <motion.div
            key={f.key}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-xl border border-border bg-card p-4"
          >
            <div
              className={`absolute -top-6 -left-6 w-20 h-20 rounded-full bg-gradient-to-br ${section.gradient} opacity-10`}
            />
            <p className="text-[11px] text-muted-foreground mb-1 relative">{f.label}</p>
            <p className="text-2xl font-bold text-foreground tabular-nums relative">
              {display}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}

function ListView({ section, payload }: { section: SectionConfig; payload: any }) {
  const items: any[] = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
    ? payload
    : [];
  const total =
    payload?.meta?.pagination?.total ??
    payload?.meta?.total ??
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