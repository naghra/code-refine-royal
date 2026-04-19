import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Store, Palette, Users, Wrench, Search, ExternalLink, Truck, MessageCircle, FileText, BarChart3, Table2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SettingsProvider, useSettings } from "./settings/SettingsContext";
import StoreTab from "./settings/StoreTab";
import ThemeTab from "./settings/ThemeTab";
import UsersRolesTab from "./settings/UsersRolesTab";
import AdvancedTab from "./settings/AdvancedTab";

type TabKey = "store" | "theme" | "users" | "advanced";

const TABS: { key: TabKey; label: string; icon: React.ComponentType<any>; desc: string }[] = [
  { key: "store", label: "المتجر", icon: Store, desc: "الهوية، العملة، الشحن، الدفع" },
  { key: "theme", label: "التصميم", icon: Palette, desc: "الألوان، الخطوط، الأنميشن" },
  { key: "users", label: "المستخدمون والصلاحيات", icon: Users, desc: "إدارة المدراء والمشرفين" },
  { key: "advanced", label: "متقدم", icon: Wrench, desc: "الصيانة، الكاش، النسخ الاحتياطي" },
];

const SHORTCUTS = [
  { to: "/admin/cod-network", label: "CodNetwork", icon: Truck, desc: "إعدادات شبكة الدفع عند الاستلام" },
  { to: "/admin/whatsapp", label: "واتساب", icon: MessageCircle, desc: "قوالب وإشعارات WhatsApp" },
  { to: "/admin/google-sheets", label: "Google Sheets", icon: Table2, desc: "ربط جداول Google" },
  { to: "/admin/pages", label: "الصفحات", icon: FileText, desc: "الشروط، الخصوصية، الإرجاع" },
  { to: "/admin/app-store", label: "التطبيقات والبيكسلات", icon: BarChart3, desc: "Facebook, TikTok, Snapchat..." },
];

function SettingsInner() {
  const navigate = useNavigate();
  const { loading } = useSettings();
  const [active, setActive] = useState<TabKey>("store");
  const [search, setSearch] = useState("");

  const filteredTabs = useMemo(() => {
    if (!search.trim()) return TABS;
    const q = search.trim().toLowerCase();
    return TABS.filter((t) => t.label.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q));
  }, [search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">الإعدادات</h2>
        <p className="text-sm text-muted-foreground mt-1">إدارة شاملة لكل إعدادات متجرك</p>
      </motion.div>

      <div className="mb-5">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث في الإعدادات..."
            className="admin-input w-full pr-10 h-10 text-sm"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        <aside className="space-y-1.5">
          {filteredTabs.map((t) => {
            const Icon = t.icon;
            const isActive = active === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={`w-full flex items-start gap-3 px-3.5 py-3 rounded-xl text-right transition-all ${
                  isActive
                    ? "bg-primary/10 border border-primary/30 text-foreground"
                    : "hover:bg-muted/60 border border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive ? "bg-primary/15 text-primary" : "bg-muted/60"
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{t.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{t.desc}</p>
                </div>
              </button>
            );
          })}

          <div className="pt-4 mt-4 border-t border-border/50">
            <p className="text-[11px] font-semibold text-muted-foreground/70 px-2 mb-2">روابط سريعة</p>
            {SHORTCUTS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.to}
                  onClick={() => navigate(s.to)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted/60 text-right text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-xs flex-1 truncate">{s.label}</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })}
          </div>
        </aside>

        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
            >
              {active === "store" && <StoreTab />}
              {active === "theme" && <ThemeTab />}
              {active === "users" && <UsersRolesTab />}
              {active === "advanced" && <AdvancedTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function AdminSettings() {
  return (
    <SettingsProvider>
      <SettingsInner />
    </SettingsProvider>
  );
}
