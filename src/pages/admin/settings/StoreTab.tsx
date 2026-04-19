import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageIcon, Coins, Truck, CreditCard, Type, Mail, Phone, Upload, Loader2, X } from "lucide-react";
import { CURRENCIES, invalidateCurrencyCache } from "@/hooks/useCurrency";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SectionCard from "./SectionCard";
import { useSettings } from "./SettingsContext";

export default function StoreTab() {
  const { settings, saveSection, saving } = useSettings();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const storeInfo = settings.store_info || {};
  const shipping = settings.shipping || {};
  const payment = settings.payment || {};

  const [storeName, setStoreName] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [currency, setCurrency] = useState("SAR");
  const [fixedRate, setFixedRate] = useState("30");
  const [freeThreshold, setFreeThreshold] = useState("200");
  const [codEnabled, setCodEnabled] = useState(true);

  useEffect(() => {
    setStoreName(storeInfo.name || "");
    setStoreDescription(storeInfo.description || "");
    setSupportEmail(storeInfo.support_email || "");
    setSupportPhone(storeInfo.support_phone || "");
    setLogoUrl(storeInfo.logo_url || "");
    setCurrency(storeInfo.currency || "SAR");
    setFixedRate(String(shipping.fixed_rate ?? 30));
    setFreeThreshold(String(shipping.free_shipping_threshold ?? 200));
    setCodEnabled(payment.cod_enabled ?? true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `store/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setLogoUrl(data.publicUrl);
      toast.success("تم رفع الشعار");
    } catch {
      toast.error("فشل رفع الشعار");
    } finally {
      setUploadingLogo(false);
    }
  };

  const saveStore = async () => {
    const ok = await saveSection("store_info", {
      name: storeName, description: storeDescription,
      support_email: supportEmail, support_phone: supportPhone,
      logo_url: logoUrl, currency,
    });
    invalidateCurrencyCache();
    ok ? toast.success("تم حفظ معلومات المتجر") : toast.error("فشل الحفظ");
  };

  const saveShipping = async () => {
    const ok = await saveSection("shipping", {
      fixed_rate: parseFloat(fixedRate) || 0,
      free_shipping_threshold: parseFloat(freeThreshold) || 0,
    });
    ok ? toast.success("تم حفظ إعدادات الشحن") : toast.error("فشل الحفظ");
  };

  const savePayment = async () => {
    const ok = await saveSection("payment", { cod_enabled: codEnabled });
    ok ? toast.success("تم حفظ إعدادات الدفع") : toast.error("فشل الحفظ");
  };

  const sym = CURRENCIES.find((c) => c.code === currency)?.symbol;

  return (
    <div className="space-y-6">
      <SectionCard
        icon={<ImageIcon className="w-5 h-5" />}
        title="هوية المتجر"
        description="الشعار، الاسم، والوصف"
        onSave={saveStore}
        saving={saving === "store_info"}
      >
        <div>
          <Label className="text-xs font-medium text-muted-foreground mb-2 block">شعار المتجر</Label>
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <div className="relative group">
                <div className="w-20 h-20 rounded-xl border-2 border-border overflow-hidden bg-muted/30 flex items-center justify-center">
                  <img src={logoUrl} alt="شعار" className="w-full h-full object-contain p-1" />
                </div>
                <button onClick={() => setLogoUrl("")} className="absolute -top-2 -left-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div onClick={() => logoInputRef.current?.click()} className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 flex flex-col items-center justify-center cursor-pointer">
                {uploadingLogo ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : (
                  <><Upload className="w-5 h-5 text-muted-foreground mb-1" /><span className="text-[10px] text-muted-foreground">رفع شعار</span></>
                )}
              </div>
            )}
            {logoUrl && <button onClick={() => logoInputRef.current?.click()} className="text-xs text-primary hover:underline">{uploadingLogo ? "جاري الرفع..." : "تغيير الشعار"}</button>}
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>
        </div>

        <div>
          <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">اسم المتجر</Label>
          <div className="relative">
            <Type className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} className="admin-input pr-10" placeholder="اسم متجرك" />
          </div>
        </div>

        <div>
          <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">وصف المتجر</Label>
          <Textarea value={storeDescription} onChange={(e) => setStoreDescription(e.target.value)} className="admin-input min-h-[80px] resize-none" placeholder="وصف قصير يظهر في الفوتر" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">بريد الدعم</Label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <Input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} dir="ltr" className="admin-input text-left pr-10" placeholder="support@store.com" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">هاتف الدعم</Label>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <Input value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} dir="ltr" className="admin-input text-left pr-10" placeholder="+966 5XX XXX XXXX" />
            </div>
          </div>
        </div>

        <div>
          <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">عملة المتجر</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="admin-input"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  <span className="flex items-center gap-2">
                    <span className="font-bold">{c.symbol}</span>
                    <span>{c.name_ar}</span>
                    <span className="text-muted-foreground text-xs">({c.code})</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      <SectionCard
        icon={<Truck className="w-5 h-5" />}
        title="إعدادات الشحن"
        description="تكاليف وخيارات التوصيل"
        onSave={saveShipping}
        saving={saving === "shipping"}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">سعر الشحن الثابت ({sym})</Label>
            <Input type="number" value={fixedRate} onChange={(e) => setFixedRate(e.target.value)} dir="ltr" className="admin-input text-left" />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">حد الشحن المجاني ({sym})</Label>
            <Input type="number" value={freeThreshold} onChange={(e) => setFreeThreshold(e.target.value)} dir="ltr" className="admin-input text-left" />
          </div>
        </div>
        <div className="p-3 rounded-xl bg-muted/50 text-xs text-muted-foreground">
          💡 الطلبات فوق <span className="font-bold text-foreground">{freeThreshold} {sym}</span> ستحصل على شحن مجاني
        </div>
      </SectionCard>

      <SectionCard
        icon={<CreditCard className="w-5 h-5" />}
        title="طرق الدفع"
        description="طرق الدفع المتاحة"
        onSave={savePayment}
        saving={saving === "payment"}
      >
        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40 border border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center"><span className="text-base">💵</span></div>
            <div>
              <p className="text-sm font-medium text-foreground">الدفع عند الاستلام (COD)</p>
              <p className="text-xs text-muted-foreground">يدفع العميل عند استلام الطلب</p>
            </div>
          </div>
          <Switch checked={codEnabled} onCheckedChange={setCodEnabled} />
        </div>
      </SectionCard>
    </div>
  );
}