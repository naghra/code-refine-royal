import React, { useEffect, useState } from "react";
import { Users, Shield, Trash2, Loader2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SectionCard from "./SectionCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { useAdmin } from "@/hooks/useAdmin";

type RoleRow = {
  id: string;
  user_id: string;
  role: string;
  email?: string;
  first_name?: string;
  last_name?: string;
};

const ROLES = [
  { value: "admin", label: "مدير عام" },
  { value: "moderator", label: "مشرف" },
  { value: "user", label: "مستخدم" },
];

export default function UsersRolesTab() {
  const { userId: currentUserId } = useAdmin();
  const [rows, setRows] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState("admin");
  const [adding, setAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("id, user_id, role")
      .order("created_at", { ascending: false });

    if (!roles) { setRows([]); setLoading(false); return; }

    const userIds = [...new Set(roles.map((r) => r.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, first_name, last_name")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
    setRows(
      roles.map((r) => {
        const p = profileMap.get(r.user_id);
        return {
          id: r.id,
          user_id: r.user_id,
          role: r.role,
          email: p?.email || undefined,
          first_name: p?.first_name || undefined,
          last_name: p?.last_name || undefined,
        };
      })
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!email.trim()) { toast.error("أدخل البريد الإلكتروني"); return; }
    setAdding(true);
    try {
      // Find user by email in profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (!profile) {
        toast.error("لم يتم العثور على مستخدم بهذا البريد. يجب أن يسجل المستخدم أولاً.");
        setAdding(false);
        return;
      }

      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: profile.user_id, role: newRole as any });
      if (error) throw error;

      toast.success("تم إضافة الدور");
      setEmail("");
      load();
    } catch (e: any) {
      toast.error(e?.message || "فشل إضافة الدور");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("user_roles").delete().eq("id", deleteId);
    if (error) {
      toast.error("فشل الحذف");
    } else {
      toast.success("تم الحذف");
      load();
    }
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <SectionCard
        icon={<UserPlus className="w-5 h-5" />}
        title="إضافة مستخدم بصلاحية"
        description="يجب أن يكون المستخدم قد سجل حساب مسبقاً"
        hideSave
      >
        <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">البريد الإلكتروني</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className="admin-input text-left" placeholder="user@example.com" />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">الصلاحية</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="admin-input"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <button onClick={handleAdd} disabled={adding} className="admin-gradient-btn h-10 px-5 text-sm flex items-center gap-2 disabled:opacity-60">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              إضافة
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={<Users className="w-5 h-5" />}
        title="المستخدمون والصلاحيات"
        description={`${rows.length} مستخدم بصلاحيات`}
        hideSave
      >
        {loading ? (
          <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">لا يوجد مستخدمون بصلاحيات</div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const isMe = r.user_id === currentUserId;
              const name = [r.first_name, r.last_name].filter(Boolean).join(" ") || r.email || r.user_id.slice(0, 8);
              return (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground flex items-center gap-2">
                        {name}
                        {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary">أنت</span>}
                      </p>
                      <p className="text-[11px] text-muted-foreground" dir="ltr">{r.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] px-2 py-1 rounded-md bg-background border border-border font-medium">
                      {ROLES.find((x) => x.value === r.role)?.label || r.role}
                    </span>
                    {!isMe && (
                      <button onClick={() => setDeleteId(r.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="حذف الصلاحية"
        description="سيتم إزالة هذه الصلاحية نهائياً من المستخدم."
        onConfirm={handleDelete}
      />
    </div>
  );
}