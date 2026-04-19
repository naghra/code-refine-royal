import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type SettingsMap = Record<string, any>;

interface Ctx {
  settings: SettingsMap;
  loading: boolean;
  saving: string | null;
  saveSection: (key: string, value: any) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const SettingsCtx = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase.from("store_settings").select("key, value");
    if (data) {
      const map: SettingsMap = {};
      for (const row of data) map[row.key] = row.value;
      setSettings(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const saveSection = useCallback(async (key: string, value: any) => {
    setSaving(key);
    try {
      const { error } = await supabase
        .from("store_settings")
        .upsert({ key, value }, { onConflict: "key" });
      if (error) throw error;
      setSettings((s) => ({ ...s, [key]: value }));
      return true;
    } catch {
      return false;
    } finally {
      setSaving(null);
    }
  }, []);

  return (
    <SettingsCtx.Provider value={{ settings, loading, saving, saveSection, refresh }}>
      {children}
    </SettingsCtx.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}