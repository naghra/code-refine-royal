import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/useCurrency";
import { CurrencySymbol } from "@/components/admin/CurrencySymbol";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2, Search, Phone, MapPin, RefreshCw, ShoppingBag, TrendingUp, Calendar,
} from "lucide-react";

type ConfirmedOrder = {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  city: string | null;
  total: number;
  status: string;
  created_at: string;
  confirmed_at: string | null;
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

export default function AdminConfirmedOrders() {
  const { currency } = useCurrency();
  const cs = currency.symbol;
  const cc = currency.code;
  const [orders, setOrders] = useState<ConfirmedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    setRefreshing(true);
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_number, customer_name, customer_phone, city, total, status, created_at, confirmed_at, confirmation_response")
      .eq("confirmation_response", "confirmed")
      .order("confirmed_at", { ascending: false, nullsFirst: false })
      .limit(500);
    if (!error && data) setOrders(data as any);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث برقم الطلب، الاسم، الجوال، المدينة..."
          className="pr-10"
        />
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