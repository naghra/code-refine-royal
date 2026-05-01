import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { DASHBOARD_FIELDS, type SectionConfig } from "./sectionConfig";

interface Props {
  section: SectionConfig;
  apiToken: string;
}

export default function SectionView({ section, apiToken }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);

  const load = async () => {
    if (!apiToken) {
      toast({ title: "أدخل API Token أولاً", variant: "destructive" });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await supabase.functions.invoke("cod-network-proxy", {
        body: { action: "get_section", section: section.key, api_token: apiToken },
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
    load();
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
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin ml-2" />
          ) : (
            <RefreshCw className="w-4 h-4 ml-2" />
          )}
          تحديث
        </Button>
      </div>

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
        const value = typeof raw === "number" ? raw : raw ?? 0;
        const display =
          typeof value === "number" ? value.toLocaleString("en-US") : String(value);
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