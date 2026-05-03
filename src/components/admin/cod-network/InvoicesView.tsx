import { motion } from "framer-motion";
import { FileText, CheckCircle2, Clock, ExternalLink, TrendingUp, Wallet, Receipt } from "lucide-react";

interface Props {
  payload: any;
}

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(v: any): string {
  return num(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(v: any): string {
  if (!v) return "—";
  const s = String(v);
  // Already in a friendly form? keep first 16 chars (YYYY-MM-DD HH:MM)
  const d = new Date(s.replace(" ", "T"));
  if (!Number.isNaN(d.getTime())) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return s.slice(0, 10);
}

function statusBadge(raw: any) {
  const s = String(raw ?? "").toLowerCase();
  const isPaid = s.includes("paid") && !s.includes("unpaid");
  if (isPaid) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30">
        <CheckCircle2 className="w-3 h-3" /> Paid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30">
      <Clock className="w-3 h-3" /> Unpaid
    </span>
  );
}

export default function InvoicesView({ payload }: Props) {
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

  // KPIs
  const totalAmount = items.reduce((acc, r) => acc + num(r?.sub_total ?? r?.total), 0);
  const paidItems = items.filter((r) => String(r?.status ?? "").toLowerCase().includes("paid") && !String(r?.status ?? "").toLowerCase().includes("unpaid"));
  const unpaidItems = items.filter((r) => !paidItems.includes(r));
  const paidAmount = paidItems.reduce((acc, r) => acc + num(r?.sub_total ?? r?.total), 0);
  const unpaidAmount = unpaidItems.reduce((acc, r) => acc + num(r?.sub_total ?? r?.total), 0);

  if (items.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
        لا توجد فواتير
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard
          label="إجمالي الفواتير"
          value={fmtMoney(totalAmount)}
          subtitle={`${items.length} فاتورة`}
          icon={Receipt}
          gradient="from-indigo-500 to-violet-600"
          ring="ring-indigo-500/30"
        />
        <KpiCard
          label="مدفوعة"
          value={fmtMoney(paidAmount)}
          subtitle={`${paidItems.length} فاتورة`}
          icon={CheckCircle2}
          gradient="from-emerald-500 to-teal-600"
          ring="ring-emerald-500/30"
        />
        <KpiCard
          label="غير مدفوعة"
          value={fmtMoney(unpaidAmount)}
          subtitle={`${unpaidItems.length} فاتورة`}
          icon={Wallet}
          gradient="from-amber-500 to-orange-600"
          ring="ring-amber-500/30"
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          الإجمالي: <span className="font-bold text-foreground">{Number(total).toLocaleString("en-US")}</span>
          {" • "}يعرض {items.length}
        </p>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <TrendingUp className="w-3.5 h-3.5" />
          آخر تحديث مباشرة من V2 API
        </div>
      </div>

      {/* Cards list */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {items.map((row, i) => {
          const id = row?.id ?? "—";
          const ref = row?.reference ?? "—";
          const subTotal = row?.sub_total ?? row?.total;
          const startAt = row?.start_at;
          const endAt = row?.end_at;
          const url = row?.pdf_url || row?.url || row?.invoice_url;
          return (
            <motion.div
              key={id || i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * i }}
              whileHover={{ y: -3 }}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-lg transition-all"
            >
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 opacity-10 blur-2xl group-hover:opacity-20 transition-opacity" />
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-slate-400 via-slate-500 to-slate-700" />

              <div className="relative flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center shadow-sm">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <div className="leading-tight">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Invoice</p>
                    <p className="text-sm font-bold text-foreground tabular-nums">#{Number(id).toLocaleString("en-US")}</p>
                  </div>
                </div>
                {statusBadge(row?.status)}
              </div>

              <div className="relative mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Sub total</p>
                  <p className="text-2xl font-black text-foreground tabular-nums leading-none mt-1">
                    {fmtMoney(subTotal)}
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Reference</p>
                  <p className="text-xs font-mono text-foreground/80 mt-1 tabular-nums">{ref}</p>
                </div>
              </div>

              <div className="relative mt-4 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-lg bg-muted/50 px-2.5 py-2">
                  <p className="text-muted-foreground">من</p>
                  <p className="font-semibold text-foreground tabular-nums">{fmtDate(startAt)}</p>
                </div>
                <div className="rounded-lg bg-muted/50 px-2.5 py-2">
                  <p className="text-muted-foreground">إلى</p>
                  <p className="font-semibold text-foreground tabular-nums">{fmtDate(endAt)}</p>
                </div>
              </div>

              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> فتح الفاتورة
                </a>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  subtitle,
  icon: Icon,
  gradient,
  ring,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: any;
  gradient: string;
  ring: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-lg hover:ring-2 ${ring} transition-all`}
    >
      <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-2xl group-hover:opacity-40 transition-opacity`} />
      <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${gradient}`} />
      <div className="relative flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-black text-foreground tabular-nums mt-2 leading-none">{value}</p>
          <p className="text-[11px] text-muted-foreground mt-2">{subtitle}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </motion.div>
  );
}