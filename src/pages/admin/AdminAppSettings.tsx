import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Save, Loader2, ToggleLeft, ToggleRight, ExternalLink, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminReviews from "./AdminReviews";
import AdminGifts from "./AdminGifts";

// ─── App config schema per app ──────────────────────────────────────
interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "toggle";
  helpText?: string;
}

interface AppConfig {
  name: string;
  description: string;
  iconBg: string;
  settingsKey: string; // store_settings key
  fields: FieldDef[];
  helpUrl?: string;
  helpLabel?: string;
}

const appConfigs: Record<string, AppConfig> = {
  "facebook-pixel": {
    name: "Facebook Browser Pixel",
    description: "تتبع أحداث المستخدمين على موقعك لتحسين حملات فيسبوك الإعلانية.",
    iconBg: "#1877F2",
    settingsKey: "tracking",
    fields: [
      { key: "facebook_pixel_id", label: "معرّف البكسل (Pixel ID)", placeholder: "123456789012345", type: "text", helpText: "تجده في Facebook Events Manager" },
      { key: "facebook_enabled", label: "تفعيل بكسل فيسبوك", placeholder: "", type: "toggle" },
    ],
    helpUrl: "https://business.facebook.com/events_manager",
    helpLabel: "Facebook Events Manager",
  },
  "facebook-api": {
    name: "Facebook API Conversion",
    description: "إرسال بيانات التحويلات من السيرفر مباشرة إلى فيسبوك.",
    iconBg: "#1877F2",
    settingsKey: "tracking",
    fields: [
      { key: "facebook_pixel_id", label: "معرّف البكسل (Pixel ID)", placeholder: "123456789012345", type: "text" },
      { key: "facebook_access_token", label: "Access Token", placeholder: "EAAxxxxx...", type: "text", helpText: "تجده في Facebook Events Manager > Settings" },
      { key: "facebook_api_enabled", label: "تفعيل API Conversion", placeholder: "", type: "toggle" },
    ],
    helpUrl: "https://business.facebook.com/events_manager",
    helpLabel: "Facebook Events Manager",
  },
  "tiktok-pixel": {
    name: "TikTok Browser Pixel",
    description: "تتبع نشاط المستخدمين بعد تفاعلهم مع إعلانات تيك توك.",
    iconBg: "#010101",
    settingsKey: "tracking",
    fields: [
      { key: "tiktok_pixel_id", label: "معرّف البكسل (Pixel ID)", placeholder: "XXXXXXXXXX", type: "text", helpText: "تجده في TikTok Ads Manager > Events" },
      { key: "tiktok_enabled", label: "تفعيل بكسل تيك توك", placeholder: "", type: "toggle" },
    ],
    helpUrl: "https://ads.tiktok.com/",
    helpLabel: "TikTok Ads Manager",
  },
  "tiktok-api": {
    name: "TikTok API Conversion",
    description: "إرسال أحداث التحويل من السيرفر مباشرة إلى تيك توك.",
    iconBg: "#010101",
    settingsKey: "tracking",
    fields: [
      { key: "tiktok_pixel_id", label: "معرّف البكسل (Pixel ID)", placeholder: "XXXXXXXXXX", type: "text" },
      { key: "tiktok_access_token", label: "Access Token", placeholder: "xxxx...", type: "text", helpText: "تجده في TikTok for Business > Developer Portal" },
      { key: "tiktok_api_enabled", label: "تفعيل API Conversion", placeholder: "", type: "toggle" },
    ],
    helpUrl: "https://ads.tiktok.com/",
    helpLabel: "TikTok Ads Manager",
  },
  "snapchat-pixel": {
    name: "Snapchat Browser Pixel",
    description: "تتبع تفاعل المستخدمين القادمين من إعلانات سنابشات.",
    iconBg: "#FFFC00",
    settingsKey: "tracking",
    fields: [
      { key: "snapchat_pixel_id", label: "معرّف البكسل (Pixel ID)", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", type: "text", helpText: "تجده في Snapchat Ads Manager > Events Manager" },
      { key: "snapchat_enabled", label: "تفعيل بكسل سنابشات", placeholder: "", type: "toggle" },
    ],
    helpUrl: "https://ads.snapchat.com/",
    helpLabel: "Snapchat Ads Manager",
  },
  "google-ads": {
    name: "Google Ads Conversions",
    description: "تتبع التحويلات لتحسين حملات Google Ads.",
    iconBg: "#4285F4",
    settingsKey: "tracking",
    fields: [
      { key: "google_ads_id", label: "معرّف التحويل (Conversion ID)", placeholder: "AW-XXXXXXXXX", type: "text", helpText: "تجده في Google Ads > Tools > Conversions" },
      { key: "google_ads_label", label: "Conversion Label", placeholder: "xXxXxXxXxXx", type: "text" },
      { key: "google_ads_enabled", label: "تفعيل Google Ads", placeholder: "", type: "toggle" },
    ],
    helpUrl: "https://ads.google.com/",
    helpLabel: "Google Ads",
  },
  "google-tag": {
    name: "Google Tag Manager",
    description: "إدارة أكواد التتبع على موقعك بدون تعديل الكود.",
    iconBg: "#F1F3F4",
    settingsKey: "tracking",
    fields: [
      { key: "gtm_container_id", label: "معرّف الحاوية (Container ID)", placeholder: "GTM-XXXXXXX", type: "text", helpText: "تجده في Google Tag Manager > Admin" },
      { key: "gtm_enabled", label: "تفعيل Google Tag Manager", placeholder: "", type: "toggle" },
    ],
    helpUrl: "https://tagmanager.google.com/",
    helpLabel: "Google Tag Manager",
  },
  "microsoft-clarity": {
    name: "Microsoft Clarity",
    description: "خرائط حرارية وتسجيلات فيديو للجلسات لفهم سلوك المستخدمين.",
    iconBg: "#fff",
    settingsKey: "tracking",
    fields: [
      { key: "clarity_project_id", label: "معرّف المشروع (Project ID)", placeholder: "xxxxxxxxxx", type: "text", helpText: "تجده في Clarity Dashboard > Settings > Setup" },
      { key: "clarity_enabled", label: "تفعيل Microsoft Clarity", placeholder: "", type: "toggle" },
    ],
    helpUrl: "https://clarity.microsoft.com/",
    helpLabel: "Microsoft Clarity",
  },
  "hotjar": {
    name: "Hotjar",
    description: "خرائط حرارية وتسجيلات جلسات لفهم سلوك العملاء.",
    iconBg: "#FFF3ED",
    settingsKey: "tracking",
    fields: [
      { key: "hotjar_site_id", label: "معرّف الموقع (Site ID)", placeholder: "1234567", type: "text", helpText: "تجده في Hotjar Dashboard > Settings" },
      { key: "hotjar_enabled", label: "تفعيل Hotjar", placeholder: "", type: "toggle" },
    ],
    helpUrl: "https://www.hotjar.com/",
    helpLabel: "Hotjar",
  },
  "pushover": {
    name: "Pushover Notifications",
    description: "تنبيهات فورية على هاتفك عند استلام طلبات جديدة. أنشئ حساب على Pushover واحصل على API Token و User Key.",
    iconBg: "#2196F3",
    settingsKey: "app_config_pushover",
    fields: [
      { key: "pushover_token", label: "API Token / App Key", placeholder: "axxxxxxxxxxxxxxxxxxxxxxxxxxxxx", type: "text", helpText: "أنشئ تطبيق جديد في pushover.net/apps واحصل على API Token" },
      { key: "pushover_user", label: "User Key", placeholder: "uxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", type: "text", helpText: "تجده في الصفحة الرئيسية لحسابك على Pushover" },
      { key: "enabled", label: "تفعيل تنبيهات Pushover", placeholder: "", type: "toggle" },
    ],
    helpUrl: "https://pushover.net/",
    helpLabel: "Pushover Dashboard",
  },
  "cod-payment": {
    name: "الدفع عند الاستلام",
    description: "تمكين خيار الدفع عند الاستلام (COD) لعملائك.",
    iconBg: "#F59E0B",
    settingsKey: "app_config_payment",
    fields: [
      { key: "cod_enabled", label: "تفعيل الدفع عند الاستلام", placeholder: "", type: "toggle" },
    ],
  },
  "bank-transfer": {
    name: "التحويل البنكي",
    description: "قبول المدفوعات عبر التحويل البنكي المباشر.",
    iconBg: "#6366F1",
    settingsKey: "app_config_payment",
    fields: [
      { key: "bank_transfer_enabled", label: "تفعيل التحويل البنكي", placeholder: "", type: "toggle" },
      { key: "bank_name", label: "اسم البنك", placeholder: "مثال: بنك الراجحي", type: "text" },
      { key: "bank_iban", label: "رقم الآيبان (IBAN)", placeholder: "SAxx xxxx xxxx xxxx xxxx xxxx", type: "text" },
      { key: "bank_account_name", label: "اسم صاحب الحساب", placeholder: "", type: "text" },
    ],
  },
  "gift-system": {
    name: "نظام الهدايا",
    description: "أضف هدايا مجانية للطلبات لزيادة معدل إتمام الشراء.",
    iconBg: "#EC4899",
    settingsKey: "app_config_gifts",
    fields: [
      { key: "gift_enabled", label: "تفعيل نظام الهدايا", placeholder: "", type: "toggle" },
    ],
  },
  "reviews": {
    name: "التقييمات والمراجعات",
    description: "عرض تقييمات ومراجعات العملاء على صفحة المنتج.",
    iconBg: "#F59E0B",
    settingsKey: "app_config_reviews",
    fields: [
      { key: "reviews_enabled", label: "تفعيل التقييمات", placeholder: "", type: "toggle" },
      { key: "default_rating", label: "التقييم الافتراضي", placeholder: "4.8", type: "text" },
      { key: "default_count", label: "عدد التقييمات الافتراضي", placeholder: "150", type: "text" },
      { key: "social_proof_purchases", label: "🔥 عرض عدد المشتريات اليوم", placeholder: "", type: "toggle" },
      { key: "social_proof_viewers", label: "👁️ عرض عدد المشاهدين الآن", placeholder: "", type: "toggle" },
      { key: "social_proof_limited", label: "⏳ عرض الكمية محدودة", placeholder: "", type: "toggle" },
    ],
  },
  "urgency-timer": {
    name: "مؤقت العرض",
    description: "عداد تنازلي يخلق إحساس بالاستعجال لدى العملاء.",
    iconBg: "#EF4444",
    settingsKey: "app_config_urgency",
    fields: [
      { key: "timer_enabled", label: "تفعيل المؤقت", placeholder: "", type: "toggle" },
      { key: "timer_minutes", label: "مدة العرض (بالدقائق)", placeholder: "15", type: "text" },
      { key: "timer_text", label: "نص العرض", placeholder: "ينتهي العرض خلال", type: "text" },
    ],
  },
  "upsell": {
    name: "Upsell & Cross-sell",
    description: "عرض منتجات إضافية لزيادة قيمة السلة.",
    iconBg: "#14B8A6",
    settingsKey: "app_config_upsell",
    fields: [
      { key: "upsell_enabled", label: "تفعيل Upsell", placeholder: "", type: "toggle" },
    ],
  },
  "cloaking": {
    name: "Cloaking Protection",
    description: "حماية صفحات المنتجات من البوتات عبر نظام اختيار الدولة وجلب الوصف من سيرفر خارجي. أضف تاج 'antibot' للمنتجات التي تريد حمايتها.",
    iconBg: "#7C3AED",
    settingsKey: "app_config_cloaking",
    fields: [
      { key: "cloaking_enabled", label: "تفعيل نظام الكلوكينج", placeholder: "", type: "toggle" },
      { key: "api_url", label: "رابط API الوصف (Supabase Function URL)", placeholder: "https://xxxxx.supabase.co/functions/v1/get-product-description", type: "text", helpText: "رابط Edge Function في حساب Supabase الخارجي" },
      { key: "supabase_anon_key", label: "Supabase Anon Key", placeholder: "eyJhbGci...", type: "text", helpText: "مفتاح anon الخاص بمشروع Supabase الخارجي" },
      { key: "supabase_url", label: "Supabase URL", placeholder: "https://xxxxx.supabase.co", type: "text", helpText: "رابط مشروع Supabase الخارجي (مثال: https://xxxxx.supabase.co)" },
      { key: "supabase_service_role_key", label: "Supabase Service Role Key", placeholder: "eyJhbGci...", type: "text", helpText: "مفتاح Service Role للكتابة في قاعدة البيانات الخارجية (مطلوب لحفظ الطلبات)" },
      { key: "sync_orders", label: "حفظ الطلبات في الحساب الخارجي", placeholder: "", type: "toggle" },
    ],
  },
};

export default function AdminAppSettings() {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const config = appId ? appConfigs[appId] : null;

  useEffect(() => {
    if (!config) return;
    const load = async () => {
      const { data } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", config.settingsKey)
        .maybeSingle();
      if (data?.value && typeof data.value === "object") {
        setValues(data.value as Record<string, any>);
      }
      setLoading(false);
    };
    load();
  }, [config?.settingsKey]);

  if (!config) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">التطبيق غير موجود</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/app-store")}>
          العودة لمتجر التطبيقات
        </Button>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("store_settings").upsert(
      { key: config.settingsKey, value: values as any },
      { onConflict: "key" }
    );
    if (error) {
      toast({ title: "خطأ", description: "فشل في حفظ الإعدادات", variant: "destructive" });
    } else {
      toast({ title: "تم الحفظ", description: `تم حفظ إعدادات ${config.name} بنجاح` });
    }
    setSaving(false);
  };

  const updateField = (key: string, val: any) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  // If this is the reviews app, render the full reviews management UI
  if (appId === "reviews") {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate("/admin/app-store")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          العودة لمتجر التطبيقات
        </button>
        <AdminReviews />
      </div>
    );
  }

  // If this is the gift system, render the gift management UI
  if (appId === "gift-system") {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate("/admin/app-store")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          العودة لمتجر التطبيقات
        </button>
        <AdminGifts />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate("/admin/app-store")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
        العودة لمتجر التطبيقات
      </button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/60 overflow-hidden"
      >
        <div className="p-6" style={{ background: `linear-gradient(135deg, ${config.iconBg}15, ${config.iconBg}05)` }}>
          <h1 className="text-xl font-bold text-foreground">{config.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
          {config.helpUrl && (
            <a
              href={config.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-3"
            >
              <ExternalLink className="w-3 h-3" />
              {config.helpLabel || "المزيد"}
            </a>
          )}
        </div>
      </motion.div>

      {/* Fields */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border/60 bg-card p-6 space-y-5"
        >
          {config.fields.map((field) => (
            <div key={field.key}>
              {field.type === "toggle" ? (
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{field.label}</Label>
                  <Switch
                    checked={!!values[field.key]}
                    onCheckedChange={(v) => updateField(field.key, v)}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">{field.label}</Label>
                  <Input
                    value={values[field.key] || ""}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    dir="ltr"
                    className="h-11 rounded-xl"
                  />
                  {field.helpText && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      {field.helpText}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}

          <div className="pt-3 border-t border-border/40">
            <Button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-xl">
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الحفظ...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  حفظ الإعدادات
                </span>
              )}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
