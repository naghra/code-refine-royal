import React, { useEffect, useState, useMemo, useCallback } from "react";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useCurrency } from "@/hooks/useCurrency";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Edit, Package, Trash2, Eye, Copy, Link2,
  ShoppingCart, AlertTriangle, DollarSign, TrendingUp, ExternalLink,
} from "lucide-react";
import { getProductCurrencySymbol } from "@/lib/format-price";
import { getFlagUrl } from "@/lib/currency-flags";

type Product = {
  id: string;
  slug: string | null;
  name_ar: string;
  price: number;
  compare_at_price: number | null;
  status: string;
  inventory: number;
  category: string | null;
  description_ar: string | null;
  updated_at: string;
  created_at: string;
  currency_enabled?: boolean;
  currency_code?: string | null;
  images: { url: string; is_main: boolean }[];
};

// --- Stat Card ---
function StatCard({ icon: Icon, label, value, suffix, gradient, delay }: {
  icon: React.ElementType; label: string; value: number | string; suffix?: string; gradient: string; delay: number;
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
          <p className="text-xl font-bold text-foreground">{typeof value === "number" ? value.toLocaleString("en-US") : value}{suffix}</p>
        </div>
      </div>
    </motion.div>
  );
}

// --- Product Card ---
function ProductCard({ product, index, systemCurrency, onEdit, onDelete, onDuplicate, onView, onCopyLink }: {
  product: Product; index: number;
  systemCurrency: import("@/hooks/useCurrency").CurrencyConfig;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (p: Product) => void;
  onView: (id: string) => void;
  onCopyLink: (id: string, name: string) => void;
}) {
  const cs = getProductCurrencySymbol(product, systemCurrency);
  const flagUrl = getFlagUrl(product.currency_enabled ? product.currency_code : systemCurrency.code);
  const thumb = product.images.find(i => i.is_main)?.url || product.images[0]?.url || null;
  const inStock = product.inventory > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3) }}
      layout
      className="group rounded-2xl border border-border/50 bg-card/90 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
    >
      {/* Image */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        {thumb ? (
          <img src={thumb} alt={product.name_ar} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-muted-foreground/30" />
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {flagUrl && (
            <div className="w-7 h-5 rounded-[3px] overflow-hidden shadow-sm border border-border/30">
              <img src={flagUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          )}
          <Badge className={`text-[10px] font-semibold border ${
            product.status === "active"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-gray-50 text-gray-600 border-gray-200"
          }`}>
            {product.status === "active" ? "نشط" : "مسودة"}
          </Badge>
        </div>

        {/* Stock warning */}
        {!inStock && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-red-50 text-red-600 border-red-200 text-[10px] font-semibold border gap-1">
              <AlertTriangle className="w-3 h-3" /> نفذ
            </Badge>
          </div>
        )}

        {/* Hover actions overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 flex-wrap px-4">
          <Button size="icon" className="h-9 w-9 rounded-xl bg-white/90 text-foreground hover:bg-white shadow-lg"
            title="تعديل"
            onClick={(e) => { e.stopPropagation(); onEdit(product.id); }}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button size="icon" className="h-9 w-9 rounded-xl bg-white/90 text-foreground hover:bg-white shadow-lg"
            title="عرض المنتج"
            onClick={(e) => { e.stopPropagation(); onView(product.id); }}>
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Button size="icon" className="h-9 w-9 rounded-xl bg-white/90 text-foreground hover:bg-white shadow-lg"
            title="نسخ الرابط"
            onClick={(e) => { e.stopPropagation(); onCopyLink(product.id, product.name_ar); }}>
            <Link2 className="w-4 h-4" />
          </Button>
          <Button size="icon" className="h-9 w-9 rounded-xl bg-white/90 text-foreground hover:bg-white shadow-lg"
            title="نسخ المنتج"
            onClick={(e) => { e.stopPropagation(); onDuplicate(product); }}>
            <Copy className="w-4 h-4" />
          </Button>
          <Button size="icon" className="h-9 w-9 rounded-xl bg-red-500/90 text-white hover:bg-red-600 shadow-lg"
            title="حذف"
            onClick={(e) => { e.stopPropagation(); onDelete(product.id); }}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-2 cursor-pointer" onClick={() => onEdit(product.id)}>
        <h3 className="text-sm font-semibold text-foreground truncate">{product.name_ar}</h3>

        {product.description_ar && (
          <p className="text-xs text-muted-foreground line-clamp-2">{product.description_ar.replace(/<[^>]*>/g, "")}</p>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-foreground">{product.price.toLocaleString("en-US")} {cs}</span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-xs text-muted-foreground line-through">{product.compare_at_price.toLocaleString("en-US")} {cs}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${inStock ? "bg-emerald-400" : "bg-red-400"}`} />
            <span className="text-[10px] text-muted-foreground">{inStock ? `${product.inventory} متوفر` : "نفذ المخزون"}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// --- Loading Skeleton ---
function ProductsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/50 overflow-hidden">
          <Skeleton className="aspect-square" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Empty State ---
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-5"
        style={{ background: "linear-gradient(135deg, hsl(250 80% 65% / 0.1), hsl(340 75% 55% / 0.08))" }}>
        <Package className="w-12 h-12" style={{ color: "hsl(250 80% 65%)" }} />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">لا توجد منتجات بعد</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">ابدأ بإضافة منتجاتك لزيادة المبيعات وإدارة متجرك</p>
      <button onClick={onAdd} className="admin-gradient-btn text-sm">
        <Plus className="w-4 h-4 inline ml-2" /> إضافة أول منتج
      </button>
    </motion.div>
  );
}

// === MAIN ===
export default function AdminProducts() {
  const { currency } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortBy, setSortBy] = useState("updated");
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*, product_images(url, is_main)")
      .order("updated_at", { ascending: false });

    if (error) {
      toast({ title: "خطأ", description: "فشل تحميل المنتجات", variant: "destructive" });
    } else {
      setProducts(
        (data || []).map((p: any) => ({
          ...p,
          images: p.product_images || [],
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (stockFilter === "in_stock" && p.inventory <= 0) return false;
      if (stockFilter === "out_of_stock" && p.inventory > 0) return false;
      if (search && !p.name_ar.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    // Sort
    if (sortBy === "price_asc") list = [...list].sort((a, b) => a.price - b.price);
    else if (sortBy === "price_desc") list = [...list].sort((a, b) => b.price - a.price);
    else if (sortBy === "name") list = [...list].sort((a, b) => a.name_ar.localeCompare(b.name_ar));
    else if (sortBy === "newest") list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    // default: updated_at desc (already from query)

    return list;
  }, [products, search, statusFilter, stockFilter, sortBy]);

  const stats = useMemo(() => {
    const total = products.length;
    const outOfStock = products.filter(p => p.inventory <= 0).length;
    const totalRevenue = products.reduce((s, p) => s + p.price * Math.max(0, 10 - p.inventory), 0); // estimate
    const topProduct = products.length > 0 ? products.reduce((top, p) => p.inventory < top.inventory ? p : top, products[0]) : null;
    return { total, outOfStock, totalRevenue, topProduct };
  }, [products]);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("products").delete().eq("id", deleteTarget);
    if (!error) {
      toast({ title: "تم حذف المنتج" });
      setProducts(prev => prev.filter(p => p.id !== deleteTarget));
    } else {
      toast({ title: "خطأ", description: "فشل حذف المنتج", variant: "destructive" });
    }
    setDeleteTarget(null);
  };

  const handleDuplicate = async (product: Product) => {
    const { data, error } = await supabase.from("products").insert({
      name_ar: product.name_ar + " (نسخة)",
      price: product.price,
      compare_at_price: product.compare_at_price,
      inventory: product.inventory,
      status: "draft",
      description_ar: product.description_ar,
      category: product.category,
    }).select().single();

    if (!error && data) {
      toast({ title: "تم نسخ المنتج" });
      fetchProducts();
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">📦 المنتجات</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{products.length} منتج</p>
        </div>
        <button onClick={() => navigate("/admin/products/new")} className="admin-gradient-btn text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> إضافة منتج
        </button>
      </motion.div>

      {/* Stats */}
      {products.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Package} label="إجمالي المنتجات" value={stats.total}
            gradient="hsl(250 80% 65%), hsl(280 70% 55%)" delay={0.05} />
          <StatCard icon={TrendingUp} label="الأكثر طلباً" value={stats.topProduct?.name_ar || "—"}
            gradient="hsl(160 70% 45%), hsl(140 60% 50%)" delay={0.1} />
          <StatCard icon={AlertTriangle} label="نفذ المخزون" value={stats.outOfStock}
            gradient="hsl(0 70% 55%), hsl(20 80% 50%)" delay={0.15} />
          <StatCard icon={DollarSign} label="إجمالي القيمة" value={products.filter(p => !p.currency_enabled).reduce((s, p) => s + p.price * p.inventory, 0).toLocaleString("en-US")} suffix={` ${currency.symbol}`}
            gradient="hsl(200 80% 55%), hsl(220 70% 60%)" delay={0.2} />
        </div>
      )}

      {/* Filters */}
      {products.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex flex-wrap gap-3 sticky top-16 z-20 bg-background/80 backdrop-blur-sm py-3 -mx-1 px-1 rounded-xl"
        >
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10 rounded-xl admin-input"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-28 rounded-xl">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="draft">مسودة</SelectItem>
            </SelectContent>
          </Select>
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-32 rounded-xl">
              <SelectValue placeholder="المخزون" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="in_stock">متوفر</SelectItem>
              <SelectItem value="out_of_stock">نفذ</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32 rounded-xl">
              <SelectValue placeholder="ترتيب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">آخر تحديث</SelectItem>
              <SelectItem value="newest">الأحدث</SelectItem>
              <SelectItem value="price_asc">السعر ↑</SelectItem>
              <SelectItem value="price_desc">السعر ↓</SelectItem>
              <SelectItem value="name">الاسم</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>
      )}

      {/* Content */}
      {loading ? (
        <ProductsSkeleton />
      ) : products.length === 0 ? (
        <EmptyState onAdd={() => navigate("/admin/products/new")} />
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">لا توجد نتائج مطابقة</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {filtered.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                index={i}
                systemCurrency={currency}
                onEdit={(id) => navigate(`/admin/products/${id}`)}
                onDelete={(id) => setDeleteTarget(id)}
                onDuplicate={handleDuplicate}
                onView={(id) => {
                  const p = filtered.find(pr => pr.id === id);
                  const link = p?.slug || id;
                  window.open(`/product/${link}`, "_blank");
                }}
                onCopyLink={(id, name) => {
                  const p = filtered.find(pr => pr.id === id);
                  const link = p?.slug || id;
                  const url = `${window.location.origin}/product/${link}`;
                  navigator.clipboard.writeText(url).then(() => {
                    toast({ title: "تم نسخ الرابط ✅", description: name });
                  });
                }}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="حذف المنتج"
        description="هل أنت متأكد أنك تريد حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء."
      />
    </div>
  );
}
