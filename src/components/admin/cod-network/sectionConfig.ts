import {
  CheckCircle,
  Truck,
  PackageSearch,
  ShoppingBag,
  Store,
  Package,
  Boxes,
  Box,
  Users,
  ShoppingCart,
  BarChart3,
  FileText,
  type LucideIcon,
} from "lucide-react";

export type SectionKey =
  | "confirmed_dashboard"
  | "delivered_dashboard"
  | "source_requests"
  | "purchases"
  | "marketplace_products"
  | "products"
  | "drop_products"
  | "stocks"
  | "leads"
  | "orders"
  | "statistics"
  | "stores"
  | "invoices";

export interface SectionConfig {
  key: SectionKey;
  label: string;
  icon: LucideIcon;
  gradient: string;
  // "stats" => key/value cards (dashboards), "list" => table of items
  kind: "stats" | "list";
}

export const SECTIONS: SectionConfig[] = [
  { key: "confirmed_dashboard", label: "Confirmed Dashboard", icon: CheckCircle, gradient: "from-emerald-500 to-teal-500", kind: "stats" },
  { key: "delivered_dashboard", label: "Delivered Dashboard", icon: Truck, gradient: "from-green-500 to-emerald-600", kind: "stats" },
  { key: "statistics", label: "Statistics", icon: BarChart3, gradient: "from-purple-500 to-indigo-500", kind: "list" },
  { key: "source_requests", label: "Source Requests", icon: PackageSearch, gradient: "from-sky-500 to-blue-500", kind: "list" },
  { key: "purchases", label: "Purchases", icon: ShoppingBag, gradient: "from-violet-500 to-purple-500", kind: "list" },
  { key: "marketplace_products", label: "Marketplace Products", icon: Store, gradient: "from-fuchsia-500 to-pink-500", kind: "list" },
  { key: "products", label: "Products", icon: Package, gradient: "from-amber-500 to-orange-500", kind: "list" },
  { key: "drop_products", label: "Drop Products", icon: Boxes, gradient: "from-rose-500 to-red-500", kind: "list" },
  { key: "stocks", label: "Stocks", icon: Box, gradient: "from-indigo-500 to-blue-600", kind: "list" },
  { key: "leads", label: "Leads", icon: Users, gradient: "from-cyan-500 to-teal-500", kind: "list" },
  { key: "orders", label: "Orders", icon: ShoppingCart, gradient: "from-orange-500 to-amber-600", kind: "list" },
  { key: "stores", label: "Stores", icon: Store, gradient: "from-teal-500 to-emerald-500", kind: "list" },
  { key: "invoices", label: "Invoices", icon: FileText, gradient: "from-slate-500 to-slate-700", kind: "list" },
];

// Field labels for the synthesized stats payload returned by the proxy.
// Keys must match the `stats` object built in cod-network-proxy/index.ts.
export const DASHBOARD_FIELDS: Record<string, { key: string; label: string }[]> = {
  confirmed_dashboard: [
    { key: "total", label: "إجمالي Leads" },
    { key: "shown", label: "المعروض حالياً" },
    { key: "pages_fetched", label: "صفحات مجلوبة" },
  ],
  delivered_dashboard: [
    { key: "total", label: "إجمالي الطلبات" },
    { key: "shown", label: "تم تجميعها" },
    { key: "total_amount", label: "إجمالي المبيعات" },
    { key: "total_amount_usd", label: "المبيعات (USD)" },
    { key: "shipping_cost", label: "تكلفة الشحن" },
    { key: "delivery_fees", label: "رسوم التوصيل" },
    { key: "profit", label: "الربح" },
    { key: "pages_fetched", label: "صفحات مجلوبة" },
  ],
};