import React, { useEffect, useState, useMemo } from "react";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { supabase } from "@/integrations/supabase/client";
import { db, clientFor, getAuthenticatedUserId } from "@/integrations/supabase/external";
import { useToast } from "@/hooks/use-toast";
import { notify } from "@/lib/notify";
import { useCurrency } from "@/hooks/useCurrency";
import { CurrencySymbol } from "@/components/admin/CurrencySymbol";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download, Search, Eye, Phone, MessageCircle, CheckCircle, XCircle,
  ShoppingCart, Clock, TrendingUp, DollarSign, ChevronDown, ChevronUp,
  Package, Trash2, MapPin, Send, Loader2, RefreshCw,
} from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

type Order = {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  city: string | null;
  total: number;
  subtotal: number;
  shipping_cost: number;
  status: string;
  payment_method: string;
  shipping_method: string;
  address: string | null;
  customer_email: string | null;
  notes: string | null;
  created_at: string;
  ip_address: string | null;
  ip_country: string | null;
  ip_city: string | null;
  cod_network_status: string | null;
  cod_network_lead_id: string | null;
  cod_network_data: any | null;
  gift_sku: string | null;
  gift_name: string | null;
  gift_selected_at: string | null;
  confirmation_response: string | null;
  lead_score: number | null;
  lead_quality: string | null;
  phone_status: string | null;
};

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type AuditLog = {
  id: string;
  action_type: string;
  created_at: string;
  after_snapshot: any;
};

const STATUS_MAP: Record<string, { label: string; dot: string; bg: string; glow: string }> = {
  pending: { label: "قيد الانتظار", dot: "bg-amber-400", bg: "bg-amber-50 text-amber-700 border-amber-200", glow: "" },
  confirmed: { label: "مؤكد", dot: "bg-emerald-400", bg: "bg-emerald-50 text-emerald-700 border-emerald-200", glow: "shadow-emerald-200/50" },
  shipped: { label: "تم الشحن", dot: "bg-blue-400", bg: "bg-blue-50 text-blue-700 border-blue-200", glow: "shadow-blue-200/50" },
  delivered: { label: "تم التسليم", dot: "bg-green-500", bg: "bg-green-50 text-green-700 border-green-200", glow: "" },
  cancelled: { label: "ملغي", dot: "bg-red-400", bg: "bg-red-50 text-red-700 border-red-200", glow: "" },
  refunded: { label: "مسترجع", dot: "bg-gray-400", bg: "bg-gray-50 text-gray-600 border-gray-200", glow: "" },
};

const PAYMENT_MAP: Record<string, string> = {
  cod: "الدفع عند الاستلام",
  bank_transfer: "تحويل بنكي",
  apple_pay: "Apple Pay",
  card: "بطاقة",
};

const COD_NETWORK_STATUS_MAP: Record<string, { label: string; color: string }> = {
  lead: { label: "ليد جديد", color: "bg-blue-100 text-blue-700 border-blue-200" },
  confirmed: { label: "مؤكد", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  delivered: { label: "تم التسليم", color: "bg-green-100 text-green-700 border-green-200" },
  return: { label: "مرتجع", color: "bg-orange-100 text-orange-700 border-orange-200" },
  call_later: { label: "اتصال لاحقاً", color: "bg-amber-100 text-amber-700 border-amber-200" },
  call_later_scheduled: { label: "مجدول", color: "bg-amber-100 text-amber-700 border-amber-200" },
  no_reply: { label: "لا رد", color: "bg-gray-100 text-gray-600 border-gray-200" },
  cancelled: { label: "ملغي", color: "bg-red-100 text-red-700 border-red-200" },
  wrong: { label: "خاطئ", color: "bg-red-100 text-red-700 border-red-200" },
  expired: { label: "منتهي", color: "bg-gray-100 text-gray-500 border-gray-200" },
  new: { label: "طلب جديد", color: "bg-blue-100 text-blue-700 border-blue-200" },
  shipped: { label: "تم الشحن", color: "bg-blue-100 text-blue-700 border-blue-200" },
  assigned: { label: "تم التعيين", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  assigned_to_courier: { label: "تم التعيين للمندوب", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  returned: { label: "مرتجع", color: "bg-orange-100 text-orange-700 border-orange-200" },
  on_hold: { label: "معلق", color: "bg-amber-100 text-amber-700 border-amber-200" },
  scheduled: { label: "مجدول", color: "bg-amber-100 text-amber-700 border-amber-200" },
  sent: { label: "تم الإرسال", color: "bg-violet-100 text-violet-700 border-violet-200" },
  failed: { label: "فشل الإرسال", color: "bg-red-100 text-red-700 border-red-200" },
};

const LEAD_STATUS_TO_SYSTEM_MAP: Record<string, string> = {
  lead: "pending",
  confirmed: "confirmed",
  delivered: "delivered",
  return: "refunded",
  call_later: "pending",
  call_later_scheduled: "pending",
  no_reply: "pending",
  cancelled: "cancelled",
  wrong: "cancelled",
  expired: "cancelled",
};

const ORDER_STATUS_TO_SYSTEM_MAP: Record<string, string> = {
  new: "pending",
  shipped: "shipped",
  delivered: "delivered",
  returned: "refunded",
  cancelled: "cancelled",
  on_hold: "pending",
  scheduled: "pending",
  assigned: "confirmed",
  assigned_to_courier: "confirmed",
};

const normalizeCodNetworkStatus = (status: string) => status.toLowerCase().replace(/\s+/g, "_");

const normalizeCodNetworkOrderStatus = (status: string) => {
  return normalizeCodNetworkStatus(status);
};

const getPreferredCodNetworkStatus = (raw: string | null, data?: any) => {
  const leadStatus = typeof data?.status === "string" ? data.status : null;
  const orderStatus = typeof data?.order?.status === "string" ? data.order.status : null;
  const normalizedOrderStatus = orderStatus ? normalizeCodNetworkOrderStatus(orderStatus) : null;

  if (normalizedOrderStatus && normalizedOrderStatus !== "new") {
    return `order:${orderStatus}`;
  }
  if (leadStatus) return `lead:${leadStatus}`;
  if (orderStatus) return `order:${orderStatus}`;
  return raw;
};

const getMappedSystemStatusFromCodData = (data?: any) => {
  const leadMappedStatus = typeof data?.status === "string"
    ? LEAD_STATUS_TO_SYSTEM_MAP[normalizeCodNetworkStatus(data.status)]
    : null;
  const orderStatus = typeof data?.order?.status === "string" ? data.order.status : null;
  const normalizedOrderStatus = orderStatus ? normalizeCodNetworkOrderStatus(orderStatus) : null;

  if (normalizedOrderStatus && normalizedOrderStatus !== "new") {
    return ORDER_STATUS_TO_SYSTEM_MAP[normalizedOrderStatus] || null;
  }
  if (leadMappedStatus) return leadMappedStatus;
  if (normalizedOrderStatus) return ORDER_STATUS_TO_SYSTEM_MAP[normalizedOrderStatus] || null;
  return null;
};

const getShipmentData = (data?: any) => (data?.order && typeof data.order === "object" ? data.order : data);

// Parse "type:status" format from cod_network_status
const parseCodNetworkStatus = (raw: string | null, data?: any) => {
  if (!raw && !data) return null;
  if (raw?.startsWith("failed:")) {
    const reason = raw.slice(7);
    return { label: "فشل الإرسال", tooltip: reason, color: "bg-red-100 text-red-700 border-red-200" };
  }
  const effectiveRaw = getPreferredCodNetworkStatus(raw, data);
  if (!effectiveRaw) return null;
  const status = effectiveRaw.includes(":") ? effectiveRaw.split(":")[1] : effectiveRaw;
  const normalizedStatus = effectiveRaw.startsWith("order:")
    ? normalizeCodNetworkOrderStatus(status)
    : normalizeCodNetworkStatus(status);
  const mapped = COD_NETWORK_STATUS_MAP[normalizedStatus];
  return mapped ? { ...mapped, tooltip: undefined as string | undefined } : { label: status, tooltip: undefined as string | undefined, color: "bg-muted text-muted-foreground border-border" };
};

const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", {
  year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
});

const isNew = (d: string) => Date.now() - new Date(d).getTime() < 30 * 60 * 1000;

// --- Stat Card ---
function StatCard({ icon: Icon, label, value, suffix, currencyCode, currencySymbolText, gradient, delay }: {
  icon: React.ElementType; label: string; value: number; suffix?: string;
  currencyCode?: string; currencySymbolText?: string;
  gradient: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="group relative rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 transition-all hover:shadow-lg hover:-translate-y-0.5"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${gradient})` }}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground inline-flex items-center gap-1">
            {value.toLocaleString("en-US")}{suffix}
            {currencyCode && currencySymbolText && (
              <CurrencySymbol code={currencyCode} symbol={currencySymbolText} iconSize="h-4 w-4" />
            )}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// --- Country map for CodNetwork ---
const CURRENCY_COUNTRY_MAP: Record<string, string> = {
  SAR: "KSA", AED: "ARE", KWD: "KWT", BHD: "BHR", QAR: "QAT",
  OMR: "OMN", EGP: "EGY", USD: "USA", EUR: "DEU", GBP: "GBR",
  MAD: "MAR", TRY: "TUR", MRU: "MRT",
};

// --- Order Card (expandable) ---
function OrderCard({ order, index, onStatusChange, onOpen, onDelete, selected, onSelect, selectionMode }: {
  order: Order; index: number;
  onStatusChange: (id: string, status: string) => void;
  onOpen: (o: Order) => void;
  onDelete: (id: string) => void;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  selectionMode: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { currency } = useCurrency();
  const cs = currency.symbol;
  const status = STATUS_MAP[order.status] || STATUS_MAP.pending;
  const orderIsNew = isNew(order.created_at);

  return (
    <div
      className={`group rounded-2xl border bg-card/90 backdrop-blur-sm transition-all duration-300 hover:shadow-lg ${
        selected ? "border-primary/50 bg-primary/5 shadow-primary/10 shadow-md" :
        orderIsNew ? "border-blue-300/60 shadow-blue-100/30 shadow-md" : "border-border/50"
      }`}
    >
      {/* Main Row */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (selectionMode) {
            onSelect(order.id, !selected);
          } else {
            setExpanded(!expanded);
          }
        }}
      >
        {/* Selection Checkbox - only in selection mode */}
        <AnimatePresence>
          {selectionMode && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => onSelect(order.id, !!checked)}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Order # + NEW badge */}
        <div className="flex flex-col items-center gap-1 min-w-[48px]">
          <span className="text-xs font-mono font-bold text-foreground">#{order.order_number}</span>
          {orderIsNew && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-[10px] font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded-full"
            >
              جديد
            </motion.span>
          )}
        </div>

        {/* Customer */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate inline-flex items-center gap-1">
            <span className="truncate">{order.customer_name}</span>
            {order.phone_status === "match" && (
              <span
                title="رقم مؤكد مرتين"
                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sky-500 text-white shrink-0"
              >
                <CheckCircle className="w-3 h-3" />
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {order.ip_city && order.ip_country && order.ip_city !== "غير معروف" ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {order.ip_city}، {order.ip_country}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><p>موقع العميل حسب IP</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <span>{order.city || "—"}</span>
            )}
            <span>· {formatDate(order.created_at)}</span>
          </p>
        </div>

        {/* Total */}
        <div className="text-left min-w-[80px] hidden sm:block">
          <p className="text-sm font-bold text-foreground inline-flex items-center gap-1">{order.total.toLocaleString("en-US")} <CurrencySymbol code={currency.code} symbol={cs} iconSize="h-3.5 w-3.5" /></p>
          <p className="text-[10px] text-muted-foreground">{PAYMENT_MAP[order.payment_method] || order.payment_method}</p>
        </div>

        {/* Status Badges */}
        <div className="flex flex-col items-end gap-1">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${status.bg} ${status.glow}`}>
            <span className={`w-2 h-2 rounded-full ${status.dot} ${order.status === "pending" ? "animate-pulse" : ""}`} />
            {status.label}
          </div>
          {order.cod_network_status && (() => {
            const parsed = parseCodNetworkStatus(order.cod_network_status, order.cod_network_data);
            return parsed ? (
              <span 
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${parsed.color}`}
                title={parsed.tooltip || undefined}
              >
                <Send className="w-2.5 h-2.5" />
                {parsed.label}
              </span>
            ) : null;
          })()}
          {order.gift_sku && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/30 dark:text-pink-400 dark:border-pink-800">
              🎁 {order.gift_name || order.gift_sku}
            </span>
          )}
          {order.confirmation_response === "rejected" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800">
              <XCircle className="w-2.5 h-2.5" />
              رفض التأكيد
            </span>
          )}
          {order.confirmation_response === "no_response" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
              <Clock className="w-2.5 h-2.5" />
              بدون رد
            </span>
          )}
          {order.lead_quality === "high_intent" && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
              title={`نتيجة التأهيل: ${order.lead_score ?? 0}/100`}
            >
              🟢 High Intent {order.lead_score != null ? `· ${order.lead_score}` : ""}
            </span>
          )}
          {order.lead_quality === "warm_lead" && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800"
              title={`نتيجة التأهيل: ${order.lead_score ?? 0}/100`}
            >
              🟠 Warm Lead {order.lead_score != null ? `· ${order.lead_score}` : ""}
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="hidden md:flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {order.status === "pending" && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
              onClick={() => onStatusChange(order.id, "confirmed")} title="تأكيد">
              <CheckCircle className="w-4 h-4" />
            </Button>
          )}
          <a href={`tel:${order.customer_phone}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" title="اتصال">
              <Phone className="w-4 h-4" />
            </Button>
          </a>
          <a href={`https://wa.me/${order.customer_phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-50" title="واتساب">
              <MessageCircle className="w-4 h-4" />
            </Button>
          </a>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted" onClick={() => onOpen(order)} title="تفاصيل">
            <Eye className="w-4 h-4" />
          </Button>
        </div>

        {/* Expand chevron */}
        <div className="text-muted-foreground">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-border/30 pt-3 space-y-3">
              {/* Info grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">الجوال</p>
                  <p className="font-medium" dir="ltr">{order.customer_phone}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">المجموع</p>
                  <p className="font-bold inline-flex items-center gap-1">{order.total.toLocaleString("en-US")} <CurrencySymbol code={currency.code} symbol={cs} iconSize="h-3.5 w-3.5" /></p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">الموقع (IP)</p>
                  <p className="font-medium flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {order.ip_city && order.ip_country && order.ip_city !== "غير معروف"
                      ? `${order.ip_city}، ${order.ip_country}`
                      : order.city || "غير معروف"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">العنوان</p>
                  <p className="font-medium">{order.address || "غير محدد"}</p>
                </div>
                {order.cod_network_status && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">حالة CodNetwork</p>
                    {(() => {
                      const parsed = parseCodNetworkStatus(order.cod_network_status, order.cod_network_data);
                      return parsed ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${parsed.color}`}>
                          {parsed.label}
                        </span>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>

              {order.notes && (
                <div className="bg-muted/60 rounded-xl p-3 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">ملاحظات:</span> {order.notes}
                </div>
              )}

              {/* Mobile quick actions */}
              <div className="flex md:hidden items-center gap-2 flex-wrap">
                {order.status === "pending" && (
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs gap-1"
                    onClick={() => onStatusChange(order.id, "confirmed")}>
                    <CheckCircle className="w-3.5 h-3.5" /> تأكيد
                  </Button>
                )}
                <a href={`tel:${order.customer_phone}`}>
                  <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1">
                    <Phone className="w-3.5 h-3.5" /> اتصال
                  </Button>
                </a>
                <a href={`https://wa.me/${order.customer_phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1 text-green-600">
                    <MessageCircle className="w-3.5 h-3.5" /> واتساب
                  </Button>
                </a>
                <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1"
                  onClick={() => onOpen(order)}>
                  <Eye className="w-3.5 h-3.5" /> تفاصيل
                </Button>
              </div>

              {/* Status change */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">تغيير الحالة:</span>
                <Select value={order.status} onValueChange={(v) => onStatusChange(order.id, v)}>
                  <SelectTrigger className="h-8 text-xs w-36 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_MAP).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Loading Skeleton ---
function OrdersSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-2xl" />
      ))}
    </div>
  );
}

// --- Empty State ---
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mb-4">
        <Package className="w-10 h-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">لا توجد طلبات</h3>
      <p className="text-sm text-muted-foreground">ستظهر الطلبات هنا عند استلامها</p>
    </motion.div>
  );
}

// === MAIN ===
export default function AdminOrders() {
  const { currency } = useCurrency();
  const cs = currency.symbol;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [internalNotes, setInternalNotes] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendingToCod, setSendingToCod] = useState(false);
  const [syncingFromCod, setSyncingFromCod] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [codNetworkSettings, setCodNetworkSettings] = useState<{ enabled: boolean; api_token: string; default_country: string; default_city: string } | null>(null);
  const [codLeadData, setCodLeadData] = useState<any>(null);
  const [loadingLeadData, setLoadingLeadData] = useState(false);
  const { toast } = useToast();

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
        if (v.enabled && v.api_token) setCodNetworkSettings(v);
      }
    })();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("list-orders", { body: {} });
    if (error || !data?.success) {
      toast({ title: "خطأ", description: "فشل تحميل الطلبات", variant: "destructive" });
      setLoading(false);
      return;
    }
    setOrders((data.orders as Order[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel(`admin-orders-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        console.log("[realtime] new order:", payload.new);
        toast({ title: "🛒 طلب جديد!", description: `طلب جديد من ${(payload.new as any).customer_name}` });
        try {
          const audio = new Audio("https://cdn.jsdelivr.net/gh/naomiaro/howler-sound-cdn@master/sounds/notification.mp3");
          audio.volume = 0.6;
          audio.play().catch(() => {});
        } catch {}
        setOrders(prev => [payload.new as Order, ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        const updated = payload.new as Order;
        setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
        setSelectedOrder(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders" }, (payload) => {
        setOrders(prev => prev.filter(o => o.id !== (payload.old as any).id));
      })
      .subscribe((status) => {
        console.log("[realtime] orders channel status:", status);
      });

    return () => { supabase.removeChannel(channel); };
  }, []);

  const PAGE_SIZE_DISPLAY = 10;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE_DISPLAY);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          o.customer_name.toLowerCase().includes(q) ||
          o.customer_phone.includes(q) ||
          String(o.order_number).includes(q) ||
          (o.city || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, search, statusFilter]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE_DISPLAY);
  }, [search, statusFilter]);

  const visibleOrders = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  // Stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const todayOrders = orders.filter(o => o.created_at.startsWith(today));
    return {
      todayCount: todayOrders.length,
      todayRevenue: todayOrders.reduce((s, o) => s + o.total, 0),
      pending: orders.filter(o => o.status === "pending").length,
      confirmed: orders.filter(o => o.status === "confirmed").length,
    };
  }, [orders]);

  const openOrder = async (order: Order) => {
    setSelectedOrder(order);
    setInternalNotes(order.notes || "");
    setCodLeadData(null);

    const { data: items } = await db("order_items")
      .select("*")
      .eq("order_id", order.id);
    setOrderItems((items as OrderItem[]) || []);

    const { data: logs } = await db("audit_logs")
      .select("*")
      .eq("entity_type", "order")
      .eq("entity_id", order.id)
      .order("created_at", { ascending: false });
    setAuditLogs((logs as AuditLog[]) || []);

    // Use stored webhook data instead of API call
    if (order.cod_network_data) {
      setCodLeadData(order.cod_network_data);
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    const order = orders.find((o) => o.id === orderId);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await db("orders")
      .update({ status: newStatus as any })
      .eq("id", orderId);

    if (!error && user) {
      await db("audit_logs").insert({
        admin_id: user.id,
        action_type: "status_change",
        entity_type: "order",
        entity_id: orderId,
        before_snapshot: { status: order?.status },
        after_snapshot: { status: newStatus },
      });
      toast({ title: "تم التحديث" });
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
        openOrder({ ...selectedOrder, status: newStatus });
      }

      // Auto-send WhatsApp message
      const eventMap: Record<string, string> = {
        confirmed: "confirmed",
        shipped: "shipped",
        delivered: "delivered",
      };
      const whatsappEvent = eventMap[newStatus];
      if (whatsappEvent) {
        supabase.functions.invoke("send-whatsapp", {
          body: { order_id: orderId, event: whatsappEvent },
        }).then(({ data, error: fnError }) => {
          if (data?.success) {
            toast({ title: "تم إرسال رسالة واتساب ✅" });
          } else if (data?.skipped) {
            // Already sent, no notification needed
          } else if (fnError || data?.error) {
            console.log("WhatsApp:", data?.error || fnError?.message);
          }
        });
      }
    }
  };

  const [deleteOrderTarget, setDeleteOrderTarget] = useState<string | null>(null);

  const confirmDeleteOrder = async () => {
    if (!deleteOrderTarget) return;
    const { error } = await db("orders").delete().eq("id", deleteOrderTarget);
    if (!error) {
      toast({ title: "تم حذف الطلب" });
    }
    setDeleteOrderTarget(null);
  };

  const saveNotes = async () => {
    if (!selectedOrder) return;
    await db("orders").update({ notes: internalNotes }).eq("id", selectedOrder.id);
    toast({ title: "تم حفظ الملاحظات" });
  };

  const exportCSV = async (ordersList?: Order[]) => {
    const target = ordersList || filtered;
    const headers = ["رقم الطلب", "العميل", "الجوال", "الموقع", "IP", "المجموع", "الكمية", "الحالة", "الدفع", "الهدية", "تقييم الليد", "نقاط الليد", "التاريخ"];
    // Fetch quantities for all target orders in one query
    const qtyMap: Record<string, number> = {};
    const ids = target.map((o) => o.id);
    if (ids.length) {
      const CHUNK = 500;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const slice = ids.slice(i, i + CHUNK);
        const { data: items } = await db("order_items")
          .select("order_id, quantity")
          .in("order_id", slice);
        (items || []).forEach((it: any) => {
          qtyMap[it.order_id] = (qtyMap[it.order_id] || 0) + Number(it.quantity || 0);
        });
      }
    }
    const qualityLabel = (q: string | null) =>
      q === "high_intent" ? "🟢 High Intent" : q === "warm_lead" ? "🟠 Warm Lead" : "";
    const escape = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = target.map((o) => [
      o.order_number, o.customer_name, o.customer_phone,
      o.ip_city && o.ip_country ? `${o.ip_city} - ${o.ip_country}` : (o.city || ""),
      o.ip_address || "",
      o.total,
      qtyMap[o.id] || 0,
      STATUS_MAP[o.status]?.label || o.status,
      PAYMENT_MAP[o.payment_method] || o.payment_method,
      o.gift_sku ? `${o.gift_name || ""} (${o.gift_sku})` : "لا توجد هدية",
      qualityLabel(o.lead_quality),
      o.lead_score != null ? `${o.lead_score}/100` : "",
      new Date(o.created_at).toLocaleDateString("en-US"),
    ]);
    const csv = "\uFEFF" + [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportSelectedCSV = () => {
    const selected = orders.filter(o => selectedIds.has(o.id));
    exportCSV(selected);
  };

  const syncAllFromCodNetwork = async () => {
    if (!codNetworkSettings?.api_token) return;
    setSyncingFromCod(true);
    // Find all orders with a lead_id
    const toSync = orders.filter(o => o.cod_network_lead_id);
    if (toSync.length === 0) {
      toast({ title: "لا توجد طلبات للمزامنة" });
      setSyncingFromCod(false);
      return;
    }
    let updated = 0;
    let failed = 0;
    for (const order of toSync) {
      try {
        const res = await supabase.functions.invoke("cod-network-proxy", {
          body: { action: "get_lead", api_token: codNetworkSettings.api_token, lead_id: order.cod_network_lead_id },
        });
        if (res.data?.success && res.data?.data?.data) {
          const leadData = res.data.data.data;
          const updateData: Record<string, any> = { cod_network_data: leadData };
          const preferredCodStatus = getPreferredCodNetworkStatus(null, leadData);
          const mappedStatus = getMappedSystemStatusFromCodData(leadData);
          if (preferredCodStatus) updateData.cod_network_status = preferredCodStatus;
          if (mappedStatus) updateData.status = mappedStatus;
          await db("orders").update(updateData).eq("id", order.id);
          updated++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }
    // Refresh orders list to reflect updates
    await fetchOrders();
    toast({
      title: `تمت المزامنة: ${updated} من ${toSync.length}`,
      description: failed > 0 ? `فشل ${failed} طلب` : undefined,
    });
    setSyncingFromCod(false);
  };

  const sendSelectedToCodNetwork = async () => {
    if (!codNetworkSettings) {
      toast({ title: "خطأ", description: "CodNetwork غير مفعل", variant: "destructive" });
      return;
    }
    setSendingToCod(true);
    const selected = orders.filter(o => selectedIds.has(o.id));
    let success = 0;
    let failed = 0;

    for (const order of selected) {
      try {
        // Fetch order items with product SKU
        const { data: items } = await db("order_items")
          .select("product_name, quantity, unit_price, total_price, product_id")
          .eq("order_id", order.id);

        // Fetch SKUs for products that have product_id
        const productIds = (items || []).map((i: any) => i.product_id).filter(Boolean);
        let skuMap: Record<string, string> = {};
        let productCurrencyCode: string | null = null;
        if (productIds.length > 0) {
          const { data: products } = await supabase
            .from("products")
            .select("id, sku, currency_enabled, currency_code")
            .in("id", productIds);
          if (products) {
            skuMap = Object.fromEntries(products.map((p: any) => [p.id, p.sku || ""]));
            // Use first product's currency if it has one
            const withCurrency = products.find((p: any) => p.currency_enabled && p.currency_code);
            if (withCurrency) productCurrencyCode = withCurrency.currency_code;
          }
        }

        // Determine country and currency from product currency or store currency
        const effectiveCurrency = productCurrencyCode || currency.code;
        const codCountry = CURRENCY_COUNTRY_MAP[effectiveCurrency] || codNetworkSettings.default_country || "KSA";
        const codCity = order.city?.trim() || codNetworkSettings.default_city || "N/A";
        const codAddress = order.address?.trim() || order.city?.trim() || "N/A";

        const leadItems = (items || []).map((item: any) => ({
          sku: (item.product_id && skuMap[item.product_id]) || item.product_name,
          price: Number(item.total_price),
          quantity: Number(item.quantity),
        })).filter((item: any) => item.price > 0); // exclude gift items already in order_items

        if (leadItems.length === 0) {
          leadItems.push({ sku: "UNKNOWN", price: Number(order.total), quantity: 1 });
        }

        // Add gift as separate item with correct SKU
        if (order.gift_sku) {
          leadItems.push({
            sku: order.gift_sku,
            price: 0,
            quantity: 1,
          });
        }

        const res = await supabase.functions.invoke("cod-network-proxy", {
          body: {
            action: "send_order",
            api_token: codNetworkSettings.api_token,
            order_data: {
              full_name: order.customer_name,
              phone: order.customer_phone,
              country: codCountry,
              address: codAddress,
              city: codCity,
              area: codCity,
              currency: effectiveCurrency,
              items: leadItems,
            },
          },
        });

        if (res.data?.success) {
          // Save lead_id and set cod_network_status to "sent"
          const leadId = res.data?.data?.data?.id || res.data?.data?.id;
          const updateData: any = { cod_network_status: "sent" };
          if (leadId) updateData.cod_network_lead_id = String(leadId);
          await db("orders").update(updateData).eq("id", order.id);
          success++;
        } else {
          // Extract error reason from CodNetwork response
          const errorData = res.data?.data;
          const errorMsg = errorData?.message || errorData?.error || (typeof errorData === 'string' ? errorData : JSON.stringify(errorData || 'فشل غير معروف'));
          const errorStatus = `failed:${errorMsg}`.slice(0, 200);
          await db("orders").update({ cod_network_status: errorStatus }).eq("id", order.id);
          failed++;
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        await db("orders").update({ cod_network_status: `failed:${errMsg}`.slice(0, 200) }).eq("id", order.id);
        failed++;
      }
    }

    setSendingToCod(false);
    setSelectedIds(new Set());
    const desc = `${success} طلب تم إرساله بنجاح${failed > 0 ? ` • ${failed} فشل` : ""}`;
    if (failed > 0 && success === 0) {
      notify.error("فشل الإرسال", { description: desc });
    } else if (failed > 0) {
      notify.warning("تم الإرسال جزئياً", { description: desc });
    } else {
      notify.success("تم الإرسال", { description: desc });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">🛒 الطلبات</h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20">
            {filtered.length.toLocaleString("en-US")} طلب
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportCSV()} className="rounded-xl gap-2">
          <Download className="w-4 h-4" /> تصدير CSV
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={ShoppingCart} label="طلبات اليوم" value={stats.todayCount}
          gradient="hsl(250 80% 65%), hsl(280 70% 55%)" delay={0.05} />
        <StatCard icon={DollarSign} label="إيرادات اليوم" value={stats.todayRevenue} currencyCode={currency.code} currencySymbolText={cs}
          gradient="hsl(160 70% 45%), hsl(140 60% 50%)" delay={0.1} />
        <StatCard icon={Clock} label="قيد الانتظار" value={stats.pending}
          gradient="hsl(40 85% 55%), hsl(30 80% 50%)" delay={0.15} />
        <StatCard icon={TrendingUp} label="مؤكدة" value={stats.confirmed}
          gradient="hsl(150 65% 45%), hsl(170 55% 40%)" delay={0.2} />
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="flex flex-wrap gap-3 sticky top-16 z-20 bg-background/80 backdrop-blur-sm py-3 -mx-1 px-1 rounded-xl"
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث برقم الطلب، الاسم، الجوال..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10 rounded-xl admin-input"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 rounded-xl">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Selection Mode Toolbar */}
      {!loading && filtered.length > 0 && (
        <AnimatePresence>
          {selectionMode ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 p-3 rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-sm"
            >
              <Checkbox
                checked={filtered.length > 0 && filtered.every(o => selectedIds.has(o.id))}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedIds(new Set(filtered.map(o => o.id)));
                  } else {
                    setSelectedIds(new Set());
                  }
                }}
                className="data-[state=checked]:bg-primary"
              />
              <span className="text-xs font-medium text-foreground">
                {selectedIds.size > 0 ? `تم تحديد ${selectedIds.size}` : `تحديد الكل (${filtered.length})`}
              </span>
              <div className="flex-1" />
              {selectedIds.size > 0 && (
                <>
                  <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1.5 h-8" onClick={exportSelectedCSV}>
                    <Download className="w-3.5 h-3.5" /> تصدير
                  </Button>
                  {codNetworkSettings && (
                    <Button size="sm" className="rounded-xl text-xs gap-1.5 h-8 bg-primary" onClick={sendSelectedToCodNetwork} disabled={sendingToCod}>
                      {sendingToCod ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      إرسال لـ CodNetwork
                    </Button>
                  )}
                </>
              )}
              <Button size="sm" variant="ghost" className="rounded-xl text-xs h-8 text-muted-foreground" onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }}>
                <XCircle className="w-3.5 h-3.5 ml-1" /> إلغاء
              </Button>
            </motion.div>
          ) : (
            <div className="flex justify-end gap-2">
              {codNetworkSettings?.api_token && orders.some(o => o.cod_network_lead_id) && (
                <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1.5 h-8" onClick={syncAllFromCodNetwork} disabled={syncingFromCod}>
                  {syncingFromCod ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  مزامنة من CodNetwork
                </Button>
              )}
              <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1.5 h-8" onClick={() => setSelectionMode(true)}>
                <CheckCircle className="w-3.5 h-3.5" /> تحديد
              </Button>
            </div>
          )}
        </AnimatePresence>
      )}

      {/* Orders List */}
      {loading ? (
        <OrdersSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {visibleOrders.map((order, i) => (
            <OrderCard
              key={order.id}
              order={order}
              index={i}
              onStatusChange={updateStatus}
              onOpen={openOrder}
              onDelete={(id) => setDeleteOrderTarget(id)}
              selected={selectedIds.has(order.id)}
              selectionMode={selectionMode}
              onSelect={(id, checked) => {
                setSelectedIds(prev => {
                  const next = new Set(prev);
                  checked ? next.add(id) : next.delete(id);
                  return next;
                });
              }}
            />
          ))}
          {hasMore && (
            <div className="flex justify-center pt-2 pb-4">
              <Button
                variant="outline"
                className="rounded-xl gap-2"
                onClick={() => setVisibleCount(prev => prev + PAGE_SIZE_DISPLAY)}
              >
                عرض المزيد ({filtered.length - visibleCount} متبقي)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Order Details Sheet */}
      <Sheet open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <SheetContent side="left" className="w-full sm:max-w-lg overflow-y-auto" dir="rtl">
          {selectedOrder && (
            <>
              <SheetHeader>
                <SheetTitle className="text-right flex items-center gap-2">
                  <div className="admin-icon-box w-8 h-8">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  طلب #{selectedOrder.order_number}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                {/* Customer */}
                <div className="rounded-2xl border border-border/50 bg-muted/30 p-4 space-y-2">
                  <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                    معلومات العميل
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-xs text-muted-foreground">الاسم</span><p className="font-medium">{selectedOrder.customer_name}</p></div>
                    <div><span className="text-xs text-muted-foreground">الجوال</span><p className="font-medium" dir="ltr">{selectedOrder.customer_phone}</p></div>
                    <div>
                      <span className="text-xs text-muted-foreground">الموقع (IP)</span>
                      <p className="font-medium flex items-center gap-1 text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {selectedOrder.ip_city && selectedOrder.ip_country && selectedOrder.ip_city !== "غير معروف"
                          ? `${selectedOrder.ip_city}، ${selectedOrder.ip_country}`
                          : "غير معروف"}
                      </p>
                    </div>
                    {selectedOrder.address && <div><span className="text-xs text-muted-foreground">العنوان</span><p className="font-medium">{selectedOrder.address}</p></div>}
                    {selectedOrder.ip_address && <div><span className="text-xs text-muted-foreground">IP</span><p className="font-medium text-muted-foreground text-xs" dir="ltr">{selectedOrder.ip_address}</p></div>}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <a href={`tel:${selectedOrder.customer_phone}`}>
                      <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1">
                        <Phone className="w-3.5 h-3.5" /> اتصال
                      </Button>
                    </a>
                    <a href={`https://wa.me/${selectedOrder.customer_phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1 text-green-600">
                        <MessageCircle className="w-3.5 h-3.5" /> واتساب
                      </Button>
                    </a>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="rounded-2xl border border-border/50 bg-muted/30 p-4 space-y-2">
                  <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> ملخص الطلب
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-xs text-muted-foreground">المجموع الفرعي</span><p className="font-medium inline-flex items-center gap-1">{selectedOrder.subtotal ?? selectedOrder.total} <CurrencySymbol code={currency.code} symbol={cs} iconSize="h-3 w-3" /></p></div>
                    <div><span className="text-xs text-muted-foreground">الشحن</span><p className="font-medium inline-flex items-center gap-1">{selectedOrder.shipping_cost ?? 0} <CurrencySymbol code={currency.code} symbol={cs} iconSize="h-3 w-3" /></p></div>
                    <div><span className="text-xs text-muted-foreground">الإجمالي</span><p className="font-bold text-base inline-flex items-center gap-1">{selectedOrder.total} <CurrencySymbol code={currency.code} symbol={cs} iconSize="h-3 w-3" /></p></div>
                    <div><span className="text-xs text-muted-foreground">طريقة الدفع</span><p className="font-medium">{selectedOrder.payment_method === "cod" ? "الدفع عند الاستلام" : selectedOrder.payment_method === "bank_transfer" ? "تحويل بنكي" : selectedOrder.payment_method === "card" ? "بطاقة" : selectedOrder.payment_method}</p></div>
                    <div><span className="text-xs text-muted-foreground">طريقة الشحن</span><p className="font-medium">{selectedOrder.shipping_method === "standard" ? "عادي" : selectedOrder.shipping_method === "express" ? "سريع" : selectedOrder.shipping_method}</p></div>
                    {selectedOrder.city && <div><span className="text-xs text-muted-foreground">المدينة</span><p className="font-medium">{selectedOrder.city}</p></div>}
                  </div>
                </div>

                {/* CodNetwork Status */}
                {(selectedOrder.cod_network_status || selectedOrder.cod_network_lead_id) && (
                  <div className="rounded-2xl border border-border/50 bg-muted/30 p-4 space-y-3">
                    <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <Send className="w-4 h-4" /> حالة CodNetwork
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground">الحالة</span>
                        {(() => {
                          const parsed = parseCodNetworkStatus(selectedOrder.cod_network_status, codLeadData || selectedOrder.cod_network_data);
                          return parsed ? (
                            <p className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${parsed.color}`} title={parsed.tooltip || undefined}>
                              <Send className="w-2.5 h-2.5" />
                              {parsed.label}
                            </p>
                          ) : null;
                        })()}
                      </div>
                      {selectedOrder.cod_network_lead_id && (
                        <div><span className="text-xs text-muted-foreground">Lead ID</span><p className="font-mono text-xs mt-1">{selectedOrder.cod_network_lead_id}</p></div>
                      )}
                    </div>

                    {/* Lead details from CodNetwork */}
                    {loadingLeadData && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> جاري جلب بيانات الشحنة...
                      </div>
                    )}
                    {selectedOrder?.cod_network_lead_id && codNetworkSettings?.api_token && !codLeadData && !loadingLeadData && (
                      <div className="border-t border-border/40 pt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs gap-2"
                          onClick={async () => {
                            setLoadingLeadData(true);
                            try {
                              const res = await supabase.functions.invoke("cod-network-proxy", {
                                body: { action: "get_lead", api_token: codNetworkSettings.api_token, lead_id: selectedOrder.cod_network_lead_id },
                              });
                              if (res.data?.success && res.data?.data?.data) {
                                const leadData = res.data.data.data;
                                setCodLeadData(leadData);
                                const updateData: Record<string, any> = { cod_network_data: leadData };
                                const preferredCodStatus = getPreferredCodNetworkStatus(null, leadData);
                                const mappedStatus = getMappedSystemStatusFromCodData(leadData);
                                if (preferredCodStatus) updateData.cod_network_status = preferredCodStatus;
                                if (mappedStatus) updateData.status = mappedStatus;
                                await db("orders").update(updateData).eq("id", selectedOrder.id);
                                toast({ title: "تم تحديث بيانات الشحنة" });
                              } else {
                                toast({ title: "لا توجد بيانات", description: "تعذر جلب بيانات من CodNetwork", variant: "destructive" });
                              }
                            } catch {
                              toast({ title: "خطأ في الاتصال", variant: "destructive" });
                            }
                            setLoadingLeadData(false);
                          }}
                        >
                          <RefreshCw className="w-3 h-3" /> جلب تحديثات من CodNetwork
                        </Button>
                      </div>
                    )}
                    {codLeadData && (
                      <div className="border-t border-border/40 pt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-muted-foreground">تفاصيل من CodNetwork</p>
                          {selectedOrder?.cod_network_lead_id && codNetworkSettings?.api_token && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs gap-1"
                              disabled={loadingLeadData}
                              onClick={async () => {
                                setLoadingLeadData(true);
                                try {
                                  const res = await supabase.functions.invoke("cod-network-proxy", {
                                    body: { action: "get_lead", api_token: codNetworkSettings.api_token, lead_id: selectedOrder!.cod_network_lead_id },
                                  });
                                  if (res.data?.success && res.data?.data?.data) {
                                    const leadData = res.data.data.data;
                                    setCodLeadData(leadData);
                                    const updateData: Record<string, any> = { cod_network_data: leadData };
                                    const preferredCodStatus = getPreferredCodNetworkStatus(null, leadData);
                                    const mappedStatus = getMappedSystemStatusFromCodData(leadData);
                                    if (preferredCodStatus) updateData.cod_network_status = preferredCodStatus;
                                    if (mappedStatus) updateData.status = mappedStatus;
                                    await db("orders").update(updateData).eq("id", selectedOrder!.id);
                                    toast({ title: "تم التحديث" });
                                  }
                                } catch {}
                                setLoadingLeadData(false);
                              }}
                            >
                              {loadingLeadData ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                              تحديث
                            </Button>
                          )}
                        </div>
                        {(() => {
                          const shipmentData = getShipmentData(codLeadData);
                          const shipmentStatus = typeof shipmentData?.status === "string" ? shipmentData.status : null;
                          const shipmentStatusKey = shipmentStatus ? normalizeCodNetworkOrderStatus(shipmentStatus) : null;
                          const shipmentStatusMeta = shipmentStatusKey ? COD_NETWORK_STATUS_MAP[shipmentStatusKey] : null;
                          const country = shipmentData?.customer_country?.name || codLeadData?.customer_country?.name || shipmentData?.country || codLeadData?.country;
                          const city = shipmentData?.customer_city || codLeadData?.customer_city || shipmentData?.city || codLeadData?.city;
                          const area = shipmentData?.customer_area || codLeadData?.customer_area || shipmentData?.area || codLeadData?.area;
                          const address = shipmentData?.customer_address || codLeadData?.customer_address || shipmentData?.address || codLeadData?.address;
                          const total = shipmentData?.total ?? shipmentData?.total_price ?? codLeadData?.total ?? codLeadData?.total_price;
                          const currency = shipmentData?.currency || codLeadData?.currency || "";
                          const reference = shipmentData?.reference || codLeadData?.reference;
                          const updatedAt = shipmentData?.last_update || shipmentData?.updated_at || codLeadData?.last_update || codLeadData?.updated_at;

                          return (
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {shipmentStatus && (
                                <div>
                                  <span className="text-xs text-muted-foreground">حالة الشحنة</span>
                                  <p className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${shipmentStatusMeta?.color || "bg-muted text-muted-foreground border-border"}`}>
                                    {shipmentStatusMeta?.label || shipmentStatus}
                                  </p>
                                </div>
                              )}
                              {shipmentData?.tracking_number && (
                                <div><span className="text-xs text-muted-foreground">رقم التتبع</span><p className="font-mono text-xs mt-1">{shipmentData.tracking_number}</p></div>
                              )}
                              {shipmentData?.shipping_company && (
                                <div><span className="text-xs text-muted-foreground">شركة الشحن</span><p className="font-medium text-xs mt-1">{shipmentData.shipping_company}</p></div>
                              )}
                              {country && (
                                <div><span className="text-xs text-muted-foreground">الدولة</span><p className="font-medium text-xs mt-1">{country}</p></div>
                              )}
                              {city && (
                                <div><span className="text-xs text-muted-foreground">المدينة</span><p className="font-medium text-xs mt-1">{city}</p></div>
                              )}
                              {area && (
                                <div><span className="text-xs text-muted-foreground">المنطقة</span><p className="font-medium text-xs mt-1">{area}</p></div>
                              )}
                              {address && (
                                <div className="col-span-2"><span className="text-xs text-muted-foreground">العنوان</span><p className="font-medium text-xs mt-1">{address}</p></div>
                              )}
                              {total != null && (
                                <div><span className="text-xs text-muted-foreground">الإجمالي</span><p className="font-bold text-xs mt-1">{total} {currency}</p></div>
                              )}
                              {reference && (
                                <div><span className="text-xs text-muted-foreground">المرجع</span><p className="font-mono text-xs mt-1">{reference}</p></div>
                              )}
                              {updatedAt && (
                                <div><span className="text-xs text-muted-foreground">آخر تحديث</span><p className="text-xs mt-1 text-muted-foreground">{formatDate(updatedAt)}</p></div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* Items */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-foreground">المنتجات</h4>
                  {orderItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground">لا توجد منتجات</p>
                  ) : (
                    <div className="border border-border/50 rounded-xl overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow><TableHead className="text-xs">المنتج</TableHead><TableHead className="text-xs">الكمية</TableHead><TableHead className="text-xs">السعر</TableHead></TableRow>
                        </TableHeader>
                        <TableBody>
                          {orderItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="text-sm">{item.product_name}</TableCell>
                              <TableCell className="text-sm">{item.quantity}</TableCell>
                              <TableCell className="text-sm inline-flex items-center gap-1">{item.total_price} <CurrencySymbol code={currency.code} symbol={cs} iconSize="h-3 w-3" /></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {/* Gift */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">🎁 الهدية المجانية</h4>
                  {selectedOrder.gift_sku ? (
                    <div className="bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800 rounded-xl p-3 space-y-1">
                      <p className="text-sm font-medium text-foreground">{selectedOrder.gift_name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {selectedOrder.gift_sku}</p>
                      {selectedOrder.gift_selected_at && (
                        <p className="text-[10px] text-muted-foreground">
                          تم الاختيار: {new Date(selectedOrder.gift_selected_at).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" })}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">لم يتم اختيار هدية</p>
                  )}
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-foreground">تغيير الحالة</h4>
                  <Select value={selectedOrder.status} onValueChange={(v) => updateStatus(selectedOrder.id, v)}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_MAP).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-foreground">ملاحظات داخلية</h4>
                  <textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    className="w-full border border-border rounded-xl p-3 text-sm min-h-[80px] bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="أضف ملاحظة..."
                  />
                  <Button size="sm" onClick={saveNotes} className="rounded-xl">حفظ الملاحظات</Button>
                </div>

                {/* Audit */}
                {auditLogs.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-foreground">سجل التغييرات</h4>
                    <div className="space-y-2">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="bg-muted/50 rounded-xl p-3 text-xs flex items-center gap-2">
                          <span className="text-muted-foreground">{formatDate(log.created_at)}</span>
                          {log.action_type === "status_change" && (
                            <span className="flex items-center gap-1">
                              → <span className={`px-2 py-0.5 rounded-full border text-[10px] ${STATUS_MAP[log.after_snapshot?.status]?.bg}`}>
                                {STATUS_MAP[log.after_snapshot?.status]?.label}
                              </span>
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDeleteDialog
        open={!!deleteOrderTarget}
        onOpenChange={(open) => !open && setDeleteOrderTarget(null)}
        onConfirm={confirmDeleteOrder}
        title="حذف الطلب"
        description="هل أنت متأكد أنك تريد حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء."
      />
    </div>
  );
}
