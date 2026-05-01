import { useEffect, useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SECTIONS, type SectionKey } from "@/components/admin/cod-network/sectionConfig";
import SectionView from "@/components/admin/cod-network/SectionView";

export default function AdminCodNetworkSection() {
  const { section } = useParams<{ section: string }>();
  const [apiToken, setApiToken] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "cod_network")
        .maybeSingle();
      const token = (data?.value as any)?.api_token || "";
      setApiToken(token);
      setLoaded(true);
    })();
  }, []);

  const cfg = SECTIONS.find((s) => s.key === (section as SectionKey));
  if (!cfg) return <Navigate to="/admin/cod-network" replace />;

  const Icon = cfg.icon;

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-6" dir="rtl">
      {/* Breadcrumb / Back */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/admin/cod-network" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
          <ArrowRight className="w-3.5 h-3.5" />
          <span>COD Network</span>
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{cfg.label}</span>
      </div>

      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-3xl p-6 lg:p-8 text-white bg-gradient-to-br ${cfg.gradient} shadow-lg`}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Icon className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">{cfg.label}</h1>
            <p className="text-sm text-white/80 mt-1">بيانات حية مباشرة من COD Network V2 API</p>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border bg-card p-5 lg:p-6 min-h-[60vh]"
      >
        {!loaded ? (
          <div className="text-center py-20 text-sm text-muted-foreground">جاري التحميل...</div>
        ) : !apiToken ? (
          <div className="text-center py-20 text-sm text-muted-foreground">
            لم يتم إعداد API Token. اذهب إلى{" "}
            <Link to="/admin/cod-network" className="text-primary underline">
              إعدادات COD Network
            </Link>
          </div>
        ) : (
          <SectionView section={cfg} apiToken={apiToken} />
        )}
      </motion.div>
    </div>
  );
}