import React, { useState } from "react";
import { Wrench, Trash2, Download, Upload, AlertTriangle, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import SectionCard from "./SectionCard";
import { useSettings } from "./SettingsContext";
import { supabase } from "@/integrations/supabase/client";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

export default function AdvancedTab() {
  const { settings, saveSection, saving, refresh } = useSettings();
  const advanced = settings.advanced || {};

  const [maintenance, setMaintenance] = useState<boolean>(!!advanced.maintenance_mode);
  const [debug, setDebug] = useState<boolean>(!!advanced.debug_mode);
  const [importing, setImporting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  React.useEffect(() => {
    setMaintenance(!!advanced.maintenance_mode);
    setDebug(!!advanced.debug_mode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const saveAdvanced = async () => {
    const ok = await saveSection("advanced", { maintenance_mode: maintenance, debug_mode: debug });
    ok ? toast.success("تم حفظ الإعدادات المتقدمة") : toast.error("فشل الحفظ");
  };

  const clearCache = () => {
    try {
      sessionStorage.clear();
      // Keep auth in localStorage; clear only known caches
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("currency_") || k.startsWith("admin-query-cache") || k.startsWith("page-content-")) {
          localStorage.removeItem(k);
        }
      });
      toast.success("تم مسح الكاش - سيتم إعادة التحميل");
      setTimeout(() => window.location.reload(), 600);
    } catch {
      toast.error("فشل مسح الكاش");
    }
  };

  const exportSettings = async () => {
    const { data } = await supabase.from("store_settings").select("key, value");
    if (!data) { toast.error("فشل التصدير"); return; }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `store-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير الإعدادات");
  };

  const importSettings = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) throw new Error("صيغة غير صالحة");
      for (const row of arr) {
        if (!row.key) continue;
        await supabase.from("store_settings").upsert({ key: row.key, value: row.value }, { onConflict: "key" });
      }
      await refresh();
      toast.success(`تم استيراد ${arr.length} إعداد`);
    } catch (err: any) {
      toast.error(err?.message || "فشل الاستيراد");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleResetTheme = async () => {
    await supabase.from("store_settings").delete().eq("key", "theme");
    await refresh();
    toast.success("تم إعادة تعيين التصميم للقيم الافتراضية");
    setConfirmReset(false);
  };

  return (
    <div className="space-y-6">
      <SectionCard
        icon={<Wrench className="w-5 h-5" />}
        title="وضع الصيانة و التشخيص"
        description="تحكم في حالة المتجر"
        onSave={saveAdvanced}
        saving={saving === "advanced"}
      >
        <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-foreground">وضع الصيانة</p>
              <p className="text-xs text-muted-foreground">إخفاء المتجر مؤقتاً عن العملاء</p>
            </div>
          </div>
          <Switch checked={maintenance} onCheckedChange={setMaintenance} />
        </div>
        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40 border border-border">
          <div>
            <p className="text-sm font-medium text-foreground">وضع التشخيص (Debug)</p>
            <p className="text-xs text-muted-foreground">إظهار رسائل تشخيصية في الكونسول</p>
          </div>
          <Switch checked={debug} onCheckedChange={setDebug} />
        </div>
      </SectionCard>

      <SectionCard
        icon={<Trash2 className="w-5 h-5" />}
        title="الكاش والأداء"
        description="إدارة ذاكرة التخزين المؤقت"
        hideSave
      >
        <button onClick={clearCache} className="admin-gradient-btn w-full flex items-center justify-center gap-2 py-2.5 text-sm">
          <Trash2 className="w-4 h-4" /> مسح الكاش وإعادة التحميل
        </button>
        <p className="text-[11px] text-muted-foreground text-center">يحذف ذاكرة المتصفح ولا يؤثر على البيانات</p>
      </SectionCard>

      <SectionCard
        icon={<Download className="w-5 h-5" />}
        title="نسخ احتياطي للإعدادات"
        description="تصدير واستيراد كل إعدادات المتجر"
        hideSave
      >
        <div className="grid gap-3 md:grid-cols-2">
          <button onClick={exportSettings} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-muted/40 border border-border hover:bg-muted text-sm font-medium transition-colors">
            <Download className="w-4 h-4" /> تصدير JSON
          </button>
          <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-muted/40 border border-border hover:bg-muted text-sm font-medium cursor-pointer transition-colors">
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {importing ? "جاري الاستيراد..." : "استيراد JSON"}
            <input type="file" accept="application/json" className="hidden" onChange={importSettings} disabled={importing} />
          </label>
        </div>
        <button onClick={() => setConfirmReset(true)} className="text-xs text-destructive hover:underline">
          إعادة تعيين إعدادات التصميم للقيم الافتراضية
        </button>
      </SectionCard>

      <ConfirmDeleteDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="إعادة تعيين التصميم"
        description="سيتم حذف كل إعدادات التصميم المخصصة والعودة للافتراضي."
        onConfirm={handleResetTheme}
      />
    </div>
  );
}