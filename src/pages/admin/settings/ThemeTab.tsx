import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette, Sparkles, Type as TypeIcon } from "lucide-react";
import { toast } from "sonner";
import SectionCard from "./SectionCard";
import { useSettings } from "./SettingsContext";
import { Textarea } from "@/components/ui/textarea";

const FONTS = [
  { value: "tajawal", label: "Tajawal (افتراضي)" },
  { value: "cairo", label: "Cairo" },
  { value: "almarai", label: "Almarai" },
  { value: "ibm-plex-arabic", label: "IBM Plex Arabic" },
];
const BUTTON_STYLES = [
  { value: "rounded", label: "دائري" },
  { value: "square", label: "مربع" },
  { value: "pill", label: "حبة (Pill)" },
];

export default function ThemeTab() {
  const { settings, saveSection, saving } = useSettings();
  const theme = settings.theme || {};

  const [primary, setPrimary] = useState("#b38a2e");
  const [secondary, setSecondary] = useState("#000000");
  const [font, setFont] = useState("tajawal");
  const [buttonStyle, setButtonStyle] = useState("rounded");
  const [animations, setAnimations] = useState(true);
  const [customCss, setCustomCss] = useState("");

  useEffect(() => {
    setPrimary(theme.primary_color || "#b38a2e");
    setSecondary(theme.secondary_color || "#000000");
    setFont(theme.font || "tajawal");
    setButtonStyle(theme.button_style || "rounded");
    setAnimations(theme.animations_enabled ?? true);
    setCustomCss(theme.custom_css || "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const save = async () => {
    const ok = await saveSection("theme", {
      primary_color: primary, secondary_color: secondary,
      font, button_style: buttonStyle,
      animations_enabled: animations, custom_css: customCss,
    });
    ok ? toast.success("تم حفظ إعدادات التصميم") : toast.error("فشل الحفظ");
  };

  return (
    <div className="space-y-6">
      <SectionCard
        icon={<Palette className="w-5 h-5" />}
        title="الألوان"
        description="ألوان متجرك الأساسية"
        onSave={save}
        saving={saving === "theme"}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">اللون الأساسي</Label>
            <div className="flex items-center gap-3">
              <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="w-12 h-10 rounded-lg border border-border cursor-pointer bg-transparent" />
              <Input value={primary} onChange={(e) => setPrimary(e.target.value)} dir="ltr" className="admin-input text-left flex-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">اللون الثانوي</Label>
            <div className="flex items-center gap-3">
              <input type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} className="w-12 h-10 rounded-lg border border-border cursor-pointer bg-transparent" />
              <Input value={secondary} onChange={(e) => setSecondary(e.target.value)} dir="ltr" className="admin-input text-left flex-1" />
            </div>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-muted/50 text-xs text-muted-foreground">
          💡 معاينة: <span className="inline-block px-3 py-1 rounded-md text-white text-xs font-bold mr-2" style={{ background: primary }}>زر أساسي</span>
          <span className="inline-block px-3 py-1 rounded-md text-white text-xs font-bold" style={{ background: secondary }}>زر ثانوي</span>
        </div>
      </SectionCard>

      <SectionCard
        icon={<TypeIcon className="w-5 h-5" />}
        title="الخطوط والأزرار"
        description="نمط الخط وشكل الأزرار"
        onSave={save}
        saving={saving === "theme"}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">الخط</Label>
            <Select value={font} onValueChange={setFont}>
              <SelectTrigger className="admin-input"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONTS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">شكل الأزرار</Label>
            <Select value={buttonStyle} onValueChange={setButtonStyle}>
              <SelectTrigger className="admin-input"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BUTTON_STYLES.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={<Sparkles className="w-5 h-5" />}
        title="الأنميشن و CSS مخصص"
        description="خيارات متقدمة"
        onSave={save}
        saving={saving === "theme"}
      >
        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40 border border-border">
          <div>
            <p className="text-sm font-medium text-foreground">تفعيل الأنميشن</p>
            <p className="text-xs text-muted-foreground">حركات الانتقال والظهور في المتجر</p>
          </div>
          <Switch checked={animations} onCheckedChange={setAnimations} />
        </div>
        <div>
          <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">CSS مخصص</Label>
          <Textarea value={customCss} onChange={(e) => setCustomCss(e.target.value)} dir="ltr" className="admin-input min-h-[120px] font-mono text-xs text-left" placeholder="/* أضف CSS مخصص هنا */" />
          <p className="text-[11px] text-muted-foreground mt-1.5">⚠️ سيتم تطبيق هذا CSS على كل صفحات المتجر</p>
        </div>
      </SectionCard>
    </div>
  );
}