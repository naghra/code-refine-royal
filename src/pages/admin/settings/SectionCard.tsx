import React from "react";
import { motion } from "framer-motion";
import { Loader2, Save } from "lucide-react";

interface Props {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  onSave?: () => void | Promise<void>;
  saving?: boolean;
  saveLabel?: string;
  hideSave?: boolean;
}

export default function SectionCard({ icon, title, description, children, onSave, saving, saveLabel = "حفظ التغييرات", hideSave }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="admin-card"
    >
      <div className="flex items-start gap-4 mb-6">
        <div className="admin-icon-box">{icon}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{title}</h3>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="space-y-5">{children}</div>
      {!hideSave && onSave && (
        <div className="mt-6 pt-5 border-t border-border/50 flex justify-end">
          <button
            onClick={() => onSave()}
            disabled={saving}
            className="admin-gradient-btn flex items-center gap-2 disabled:opacity-60 px-5 py-2.5 text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "جاري الحفظ..." : saveLabel}
          </button>
        </div>
      )}
    </motion.div>
  );
}