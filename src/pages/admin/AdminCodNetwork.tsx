import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Send, Key, Globe, MapPin, RefreshCw, Package, Box, Search, Filter, LayoutDashboard, AlertTriangle, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SECTIONS, type SectionKey } from "@/components/admin/cod-network/sectionConfig";
import SectionView from "@/components/admin/cod-network/SectionView";

interface CodNetworkSettings {
  enabled: boolean;
  auto_send: boolean;
  api_token: string;
  default_country: string;
  default_city: string;
}

interface CodProduct {
  id: number;
  sku: string;
  name: string;
  price: number;
  currency: string;
  status: string;
  stocks: { country: string; quantity: number; project?: string }[];
  created_at: string;
}

const DEFAULT: CodNetworkSettings = {
  enabled: false,
  auto_send: false,
  api_token: "",
  default_country: "SA",
  default_city: "",
};

export default function AdminCodNetwork() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<CodNetworkSettings>(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [products, setProducts] = useState<CodProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [activeSection, setActiveSection] = useState<SectionKey>("confirmed_dashboard");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "cod_network")
        .maybeSingle();
      if (data?.value) {
        setSettings({ ...DEFAULT, ...(data.value as any) });
        if ((data.value as any).api_token) setConnected(true);
      }
      setLoaded(true);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("store_settings")
      .upsert({ key: "cod_network", value: settings as any }, { onConflict: "key" });
    setSaving(false);
    if (error) {
      toast({ title: "خطأ", description: "فشل الحفظ", variant: "destructive" });
    } else {
      toast({ title: "تم الحفظ بنجاح ✅" });
    }
  };

  const testConnection = async () => {
    if (!settings.api_token) {
      toast({ title: "أدخل API Token أولاً", variant: "destructive" });
      return;
    }
    setTesting(true);
    try {
      const res = await supabase.functions.invoke("cod-network-proxy", {
        body: { action: "test", api_token: settings.api_token },
      });
      if (res.error) throw res.error;
      const ok = res.data?.success !== false;
      setConnected(ok);
      toast({ title: ok ? "✅ الاتصال ناجح" : "❌ فشل الاتصال", variant: ok ? "default" : "destructive" });
    } catch {
      setConnected(false);
      toast({ title: "❌ فشل الاتصال", variant: "destructive" });
    }
    setTesting(false);
  };

  const fetchProducts = async () => {
    if (!settings.api_token) {
      toast({ title: "أدخل API Token أولاً", variant: "destructive" });
      return;
    }
    setLoadingProducts(true);
    try {
      const res = await supabase.functions.invoke("cod-network-proxy", {
        body: { action: "get_products", api_token: settings.api_token },
      });
      if (res.error) throw res.error;
      const productData = res.data?.data?.data || [];
      setProducts(Array.isArray(productData) ? productData : []);
      toast({ title: `✅ تم جلب ${Array.isArray(productData) ? productData.length : 0} منتج` });
    } catch (err) {
      console.error("Failed to fetch products:", err);
      toast({ title: "❌ فشل جلب المنتجات", variant: "destructive" });
    }
    setLoadingProducts(false);
  };

  const getTotalStock = (stocks: CodProduct["stocks"]) => {
    if (!stocks || !Array.isArray(stocks)) return 0;
    return stocks.reduce((sum, s) => sum + (s.quantity || 0), 0);
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filteredProducts = products.filter((p) => {
    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const stock = getTotalStock(p.stocks);
    const matchesStock = stockFilter === "all" || 
      (stockFilter === "in_stock" && stock > 0) ||
      (stockFilter === "out_of_stock" && stock === 0);
    return matchesSearch && matchesStatus && matchesStock;
  });

  // Decode JWT exp claim to compute remaining days. Returns null if not a JWT.
  const tokenInfo = (() => {
    const t = settings.api_token?.trim();
    if (!t || !t.includes(".")) return null;
    try {
      const payload = JSON.parse(
        atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      const exp = Number(payload?.exp);
      if (!exp) return null;
      const expMs = exp * 1000;
      const daysLeft = Math.floor((expMs - Date.now()) / (1000 * 60 * 60 * 24));
      return { expMs, daysLeft, expDate: new Date(expMs) };
    } catch {
      return null;
    }
  })();

  const showTokenAlert =
    tokenInfo !== null && tokenInfo.daysLeft <= 7;
  const expired = tokenInfo !== null && tokenInfo.daysLeft < 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6" dir="rtl">
      {/* Token expiry banner */}
      {showTokenAlert && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative overflow-hidden rounded-2xl border p-4 flex items-start gap-3 ${
            expired
              ? "border-destructive/40 bg-destructive/10"
              : "border-amber-500/40 bg-amber-50 dark:bg-amber-950/30"
          }`}
        >
          <div
            className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
              expired ? "bg-destructive text-white" : "bg-amber-500 text-white"
            }`}
          >
            {expired ? <AlertTriangle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${expired ? "text-destructive" : "text-amber-900 dark:text-amber-200"}`}>
              {expired
                ? "⚠️ انتهت صلاحية API Token"
                : tokenInfo!.daysLeft === 0
                ? "⏰ صلاحية API Token تنتهي اليوم"
                : `⏰ تبقى ${tokenInfo!.daysLeft} ${tokenInfo!.daysLeft === 1 ? "يوم" : "أيام"} على انتهاء صلاحية API Token`}
            </p>
            <p className="text-xs mt-1 text-foreground/70">
              تاريخ الانتهاء:{" "}
              <span dir="ltr" className="font-mono">
                {tokenInfo!.expDate.toLocaleString("en-GB", {
                  timeZone: "Asia/Riyadh",
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </p>
            <p className="text-xs mt-1 text-foreground/70">
              {expired
                ? "أنشئ توكناً جديداً من حساب COD Network والصقه في الحقل أدناه ثم اضغط حفظ."
                : "جدّد التوكن من لوحة COD Network قبل انتهاء صلاحيته لتفادي توقف اللوحات."}
            </p>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center border border-border shadow-sm">
          <Send className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">COD Network</h1>
          <p className="text-sm text-muted-foreground">إرسال الطلبات تلقائياً إلى COD Network</p>
        </div>
      </motion.div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border bg-card p-6 space-y-6"
        style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
      >
        {/* Enable Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Send className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">تفعيل التكامل</p>
              <p className="text-xs text-muted-foreground">إرسال الطلبات تلقائياً عند إنشائها</p>
            </div>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(v) => setSettings((s) => ({ ...s, enabled: v }))}
          />
        </div>

        <div className="border-t border-border" />

        {/* Auto Send Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Send className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">إرسال تلقائي</p>
              <p className="text-xs text-muted-foreground">إرسال كل طلب جديد تلقائياً عند إنشائه</p>
            </div>
          </div>
          <Switch
            checked={settings.auto_send}
            onCheckedChange={(v) => setSettings((s) => ({ ...s, auto_send: v }))}
            disabled={!settings.enabled}
          />
        </div>

        <div className="border-t border-border" />

        {/* Status */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">الحالة:</span>
          {connected === true ? (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
              <CheckCircle className="w-4 h-4" /> متصل
            </span>
          ) : connected === false ? (
            <span className="flex items-center gap-1.5 text-sm text-destructive font-medium">
              <XCircle className="w-4 h-4" /> غير متصل
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">غير محدد</span>
          )}
        </div>

        <div className="border-t border-border" />

        {/* API Token */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Key className="w-4 h-4 text-muted-foreground" />
            API Token (Bearer)
          </label>
          <Input
            type="password"
            dir="ltr"
            placeholder="أدخل Bearer Token هنا"
            value={settings.api_token}
            onChange={(e) => setSettings((s) => ({ ...s, api_token: e.target.value }))}
            className="font-mono text-sm"
          />
        </div>

        {/* Default Country */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            الدولة الافتراضية
          </label>
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3">
            🌍 يتم تحديد الدولة تلقائياً بناءً على عملة المنتج (مثال: ريال سعودي → SA)
          </p>
          <Input
            dir="ltr"
            placeholder="SA (احتياطي فقط)"
            value={settings.default_country}
            onChange={(e) => setSettings((s) => ({ ...s, default_country: e.target.value }))}
          />
          <p className="text-[11px] text-muted-foreground">تُستخدم فقط إذا لم يتم تحديد عملة للمنتج</p>
        </div>

        {/* Default City */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            المدينة الافتراضية (اختياري)
          </label>
          <Input
            placeholder="مثال: الرياض"
            value={settings.default_city}
            onChange={(e) => setSettings((s) => ({ ...s, default_city: e.target.value }))}
          />
        </div>

        <div className="border-t border-border" />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={save} disabled={saving} className="flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
            حفظ الإعدادات
          </Button>
          <Button variant="outline" onClick={testConnection} disabled={testing} className="flex-1">
            {testing ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <RefreshCw className="w-4 h-4 ml-2" />}
            اختبار الاتصال
          </Button>
        </div>
      </motion.div>

      {/* Products Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border border-border bg-card p-6 space-y-4"
        style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">المنتجات والمخزون</p>
              <p className="text-xs text-muted-foreground">
                {products.length > 0 ? `${products.length} منتج • يظهر ${filteredProducts.length}` : "جلب منتجاتك ومخزوناتك من COD Network"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProducts}
            disabled={loadingProducts || !settings.api_token}
          >
            {loadingProducts ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <RefreshCw className="w-4 h-4 ml-2" />}
            {loadingProducts ? "جارٍ الجلب..." : "جلب المنتجات"}
          </Button>
        </div>

        {/* Filters */}
        {products.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px] text-sm">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="Enabled">مفعّل</SelectItem>
                <SelectItem value="Disabled">معطّل</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-full sm:w-[140px] text-sm">
                <SelectValue placeholder="المخزون" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المخزون</SelectItem>
                <SelectItem value="in_stock">متوفر</SelectItem>
                <SelectItem value="out_of_stock">نفذ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Products List */}
        {products.length > 0 && (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border">
              <span>المنتج</span>
              <span>SKU</span>
              <span>السعر</span>
              <span>المخزون</span>
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <Filter className="w-5 h-5 mx-auto mb-2 opacity-30" />
                  لا توجد منتجات تطابق الفلاتر
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-3 py-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Box className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium text-foreground truncate">{product.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                        product.status === "Enabled" 
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}>
                        {product.status === "Enabled" ? "مفعّل" : "معطّل"}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded-lg">{product.sku}</span>
                    <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                      {product.price} {product.currency}
                    </span>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className={`text-sm font-bold ${getTotalStock(product.stocks) > 0 ? "text-emerald-600" : "text-destructive"}`}>
                        {getTotalStock(product.stocks)}
                      </span>
                      {product.stocks && product.stocks.length > 0 && (
                        <div className="flex gap-1">
                          {product.stocks.map((s, i) => (
                            <span key={i} className="text-[10px] text-muted-foreground">
                              {s.country}: {s.quantity}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

        {products.length === 0 && !loadingProducts && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
            اضغط "جلب المنتجات" لعرض منتجاتك من COD Network
          </div>
        )}
      </motion.div>

      {/* Network Sections (separate views per section) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="rounded-2xl border border-border bg-card p-6 space-y-5"
        style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">أقسام COD Network</p>
            <p className="text-xs text-muted-foreground">كل قسم منفصل ببياناته الفعلية من V2 API</p>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = activeSection === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                  active
                    ? `text-white border-transparent bg-gradient-to-br ${s.gradient} shadow-sm`
                    : "text-muted-foreground border-border bg-muted/40 hover:bg-muted"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            );
          })}
        </div>

        <div className="border-t border-border" />

        {/* Active section content */}
        {settings.api_token ? (
          <SectionView
            key={activeSection}
            section={SECTIONS.find((s) => s.key === activeSection)!}
            apiToken={settings.api_token}
          />
        ) : (
          <div className="text-center py-10 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
            أدخل API Token أعلاه لعرض البيانات
          </div>
        )}
      </motion.div>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-border bg-muted/50 p-5 space-y-2"
      >
        <h3 className="text-sm font-bold text-foreground">ℹ️ كيف يعمل</h3>
        <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
          <li>عند تفعيل التكامل، سيتم إرسال كل طلب جديد تلقائياً إلى COD Network</li>
          <li>يجب إدخال API Token الخاص بك من حساب COD Network</li>
          <li>تأكد من إضافة CodNetwork SKU لكل منتج في إعدادات المنتج</li>
          <li>في حال فشل الإرسال، سيتم حفظ الطلب محلياً ولن يتأثر</li>
        </ul>
      </motion.div>
    </div>
  );
}
