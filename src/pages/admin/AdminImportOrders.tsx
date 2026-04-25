import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { db, clientFor, getAuthenticatedUserId } from "@/integrations/supabase/external";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Upload, FileSpreadsheet, RefreshCw, CheckCircle2, XCircle,
  AlertTriangle, ArrowRight, MessageCircle, Truck, Download,
  ChevronDown, ChevronUp, Search, Filter,
} from "lucide-react";
import * as XLSX from "xlsx";

/* ─── types ─── */
interface ImportRow {
  reference: string;
  leadId: string;
  customerName: string;
  customerPhone: string;
  status: string;
  products: string;
  trackingNumber: string;
  trackingStatus: string;
  lastUpdate: string;
}

interface MatchResult {
  row: ImportRow;
  orderId: string | null;
  orderNumber: number | null;
  oldStatus: string | null;
  newStatus: string;
  statusChanged: boolean;
  updated: boolean;
  whatsappSent: boolean;
  error: string | null;
}

/* ─── status map ─── */
const mapCodStatus = (raw: string): string => {
  const s = raw?.toLowerCase().trim() || "";
  if (["delivered", "completed"].some(k => s.includes(k))) return "delivered";
  if (["out for delivery", "last mile", "with courier"].some(k => s.includes(k))) return "shipped";
  if (["returned", "rto", "return"].some(k => s.includes(k))) return "cancelled";
  if (["confirmed", "accepted", "assigned", "processing"].some(k => s.includes(k))) return "confirmed";
  if (["cancelled", "rejected"].some(k => s.includes(k))) return "cancelled";
  if (["new", "pending"].some(k => s.includes(k))) return "pending";
  return "pending";
};

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  confirmed: "مؤكد",
  shipped: "تم الشحن",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
  refunded: "مسترجع",
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
};

export default function AdminImportOrders() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");

  /* ─── parse file ─── */
  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        const parsed: ImportRow[] = json.map((r) => ({
          reference: String(r["Reference"] || r["reference"] || r["Ref"] || r["ref"] || r["Order ID"] || r["order_id"] || "").trim(),
          leadId: String(r["Lead ID"] || r["lead_id"] || r["LeadID"] || r["leadId"] || "").trim(),
          customerName: String(r["Customer Name"] || r["customer_name"] || r["Name"] || r["name"] || "").trim(),
          customerPhone: String(r["Customer Phone"] || r["customer_phone"] || r["Phone"] || r["phone"] || "").trim().replace(/\.0$/, ""),
          status: String(r["Status"] || r["status"] || "").trim(),
          products: String(r["Products"] || r["products"] || r["Product"] || r["product"] || "").trim(),
          trackingNumber: String(r["Tracking Number"] || r["tracking_number"] || r["AWB"] || r["awb"] || "").trim().replace(/\.0$/, ""),
          trackingStatus: String(r["Tracking Status"] || r["tracking_status"] || "").trim(),
          lastUpdate: String(r["Last Update"] || r["last_update"] || r["Updated At"] || "").trim(),
        })).filter(r => r.reference || r.leadId);

        setRows(parsed);
        setStep("preview");
        setResults([]);
        toast({ title: `تم قراءة ${parsed.length} طلب من الملف` });
      } catch {
        toast({ title: "خطأ في قراءة الملف", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  }, [toast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  /* ─── process sync ─── */
  const processSync = async () => {
    setProcessing(true);
    setProgress(0);
    const matchResults: MatchResult[] = [];
    const batchSize = 20;

    // Get WhatsApp settings
    const { data: waSettings } = await supabase
      .from("store_settings")
      .select("value")
      .eq("key", "whatsapp_settings")
      .maybeSingle();
    const waConfig = waSettings?.value as any;
    const waEnabled = waConfig?.enabled && waConfig?.instance_id && waConfig?.api_token;

    // Get "shipped" template for out-for-delivery
    const { data: waTemplates } = await supabase
      .from("whatsapp_templates")
      .select("*")
      .eq("event", "shipped")
      .eq("is_active", true)
      .limit(1);
    const shippedTemplate = waTemplates?.[0];

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      
      // Collect all possible identifiers for matching
      const leadIds = batch.map(r => r.leadId).filter(Boolean);
      const refs = batch.map(r => r.reference).filter(Boolean);
      // Also try reference without CODNET- prefix as lead_id
      const refAsLeadIds = refs.map(r => r.replace(/^CODNET-/i, "")).filter(r => /^\d+$/.test(r));
      const allLeadIds = [...new Set([...leadIds, ...refAsLeadIds])];

      // Match by cod_network_lead_id
      const { data: ordersByLead } = allLeadIds.length > 0
        ? await supabase
            .from("orders")
            .select("id, order_number, status, customer_name, customer_phone, cod_network_lead_id")
            .in("cod_network_lead_id", allLeadIds)
        : { data: [] };

      // Match by order_number (numeric refs)
      const numericRefs = refs.filter(r => /^\d+$/.test(r)).map(Number);
      const { data: ordersByNum } = numericRefs.length > 0
        ? await supabase
            .from("orders")
            .select("id, order_number, status, customer_name, customer_phone, cod_network_lead_id")
            .in("order_number", numericRefs)
        : { data: [] };

      const orderMap = new Map<string, any>();
      (ordersByLead || []).forEach(o => {
        if (o.cod_network_lead_id) orderMap.set(o.cod_network_lead_id, o);
      });
      (ordersByNum || []).forEach(o => {
        orderMap.set(String(o.order_number), o);
      });

      for (const row of batch) {
        // Try multiple keys to find the order
        const order = orderMap.get(row.leadId) 
          || orderMap.get(row.reference.replace(/^CODNET-/i, ""))
          || orderMap.get(row.reference);
        const newStatus = mapCodStatus(row.trackingStatus || row.status);
        const result: MatchResult = {
          row,
          orderId: order?.id || null,
          orderNumber: order?.order_number || null,
          oldStatus: order?.status || null,
          newStatus,
          statusChanged: order ? order.status !== newStatus : false,
          updated: false,
          whatsappSent: false,
          error: null,
        };

        if (order) {
          const codNetworkUpdate: Record<string, any> = {
            cod_network_status: row.trackingStatus || row.status || null,
            cod_network_data: {
              tracking_number: row.trackingNumber,
              tracking_status: row.trackingStatus,
              last_update: row.lastUpdate,
              imported_at: new Date().toISOString(),
              reference: row.reference,
              lead_id: row.leadId,
            },
            cod_network_lead_id: row.leadId || order.cod_network_lead_id || null,
          };

          // Only upgrade main status if it actually changed and is higher priority
          if (result.statusChanged) {
            const statusOrder = ["pending", "confirmed", "shipped", "delivered", "cancelled", "refunded"];
            const oldIdx = statusOrder.indexOf(order.status);
            const newIdx = statusOrder.indexOf(newStatus);
            if (newIdx > oldIdx || newStatus === "cancelled") {
              codNetworkUpdate.status = newStatus as any;
            }
          }

          const { error } = await supabase
            .from("orders")
            .update(codNetworkUpdate)
            .eq("id", order.id);

          if (error) {
            result.error = error.message;
          } else {
            result.updated = true;

              // Send WhatsApp for "shipped" (out for delivery)
              if (newStatus === "shipped" && waEnabled && shippedTemplate) {
                const phone = (order.customer_phone || row.customerPhone).replace(/\D/g, "");
                if (phone) {
                  // Check if already sent
                  const { data: existing } = await supabase
                    .from("whatsapp_message_logs")
                    .select("id")
                    .eq("order_id", order.id)
                    .eq("template_id", shippedTemplate.id)
                    .limit(1);

                  if (!existing?.length) {
                    try {
                      const msgBody = shippedTemplate.body
                        .replace(/\{\{name\}\}/g, order.customer_name || row.customerName)
                        .replace(/\{\{phone\}\}/g, phone)
                        .replace(/\{\{product\}\}/g, row.products)
                        .replace(/\{\{order_number\}\}/g, String(order.order_number))
                        .replace(/\{\{tracking\}\}/g, row.trackingNumber);

                      const { error: fnError } = await supabase.functions.invoke("send-whatsapp", {
                        body: {
                          phone,
                          message: msgBody,
                          instance_id: waConfig.instance_id,
                          api_token: waConfig.api_token,
                        },
                      });

                      if (!fnError) {
                        result.whatsappSent = true;
                        await supabase.from("whatsapp_message_logs").insert({
                          order_id: order.id,
                          template_id: shippedTemplate.id,
                          phone,
                          message_body: msgBody,
                          status: "sent",
                        });
                      }
                    } catch (e: any) {
                      console.error("WhatsApp send error:", e);
                    }
                  }
                }
            }
          }
        }

        matchResults.push(result);
      }

      setProgress(Math.min(100, Math.round(((i + batch.length) / rows.length) * 100)));
    }

    setResults(matchResults);
    setStep("done");
    setProcessing(false);

    const updated = matchResults.filter(r => r.updated).length;
    const waSent = matchResults.filter(r => r.whatsappSent).length;
    const matched = matchResults.filter(r => r.orderId).length;
    const errors = matchResults.filter(r => r.error).length;

    toast({
      title: "تمت المزامنة",
      description: `${matched} مطابق · ${updated} محدّث · ${waSent} رسالة · ${errors} خطأ`,
    });
  };

  /* ─── stats ─── */
  const stats = {
    total: results.length,
    matched: results.filter(r => r.orderId).length,
    updated: results.filter(r => r.updated).length,
    whatsapp: results.filter(r => r.whatsappSent).length,
    skipped: results.filter(r => !r.orderId).length,
    errors: results.filter(r => r.error).length,
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-violet-600 via-purple-500 to-fuchsia-500 text-white"
      >
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-[-50%] right-[-20%] w-[400px] h-[400px] rounded-full bg-white/20 blur-3xl" />
        </div>
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Download className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">استيراد الطلبات</h1>
            <p className="text-white/80 text-sm mt-1">مزامنة الطلبات من COD Network عبر ملف Excel أو CSV</p>
          </div>
        </div>
      </motion.div>

      {/* Step: Upload */}
      {step === "upload" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-2 border-dashed border-border rounded-2xl p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Upload className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">اسحب الملف هنا أو اضغط للرفع</h3>
          <p className="text-sm text-muted-foreground">يدعم Excel (.xlsx, .xls) و CSV</p>
        </motion.div>
      )}

      {/* Step: Preview */}
      {step === "preview" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-card rounded-2xl border p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                <span className="font-medium">{fileName}</span>
                <span className="text-sm text-muted-foreground">({rows.length.toLocaleString("en-US")} طلب)</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setStep("upload"); setRows([]); }}>
                  تغيير الملف
                </Button>
                <Button size="sm" onClick={processSync} disabled={processing}>
                  {processing ? <Loader /> : <><RefreshCw className="w-4 h-4 ml-2" /> بدء المزامنة</>}
                </Button>
              </div>
            </div>

            {processing && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">{progress}%</p>
              </div>
            )}

            {/* Preview table */}
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto mt-4 rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="p-3 text-right font-medium">Reference</th>
                    <th className="p-3 text-right font-medium">Lead ID</th>
                    <th className="p-3 text-right font-medium">العميل</th>
                    <th className="p-3 text-right font-medium">الهاتف</th>
                    <th className="p-3 text-right font-medium">الحالة</th>
                    <th className="p-3 text-right font-medium">التتبع</th>
                    <th className="p-3 text-right font-medium">حالة التتبع</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.slice(0, 50).map((r, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="p-3 font-mono text-xs">{r.reference}</td>
                      <td className="p-3 font-mono text-xs">{r.leadId || "—"}</td>
                      <td className="p-3">{r.customerName}</td>
                      <td className="p-3 font-mono text-xs" dir="ltr">{r.customerPhone}</td>
                      <td className="p-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[mapCodStatus(r.status)] || "bg-gray-100"}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-xs">{r.trackingNumber || "—"}</td>
                      <td className="p-3 text-xs">{r.trackingStatus || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 50 && (
                <p className="text-center text-xs text-muted-foreground py-3">
                  يعرض أول 50 من {rows.length.toLocaleString("en-US")} طلب
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "إجمالي", value: stats.total, icon: FileSpreadsheet, color: "text-foreground" },
              { label: "مطابق", value: stats.matched, icon: Search, color: "text-blue-600" },
              { label: "محدّث", value: stats.updated, icon: RefreshCw, color: "text-emerald-600" },
              { label: "رسائل", value: stats.whatsapp, icon: MessageCircle, color: "text-green-600" },
              { label: "غير موجود", value: stats.skipped, icon: AlertTriangle, color: "text-amber-600" },
              { label: "أخطاء", value: stats.errors, icon: XCircle, color: "text-red-600" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-card rounded-xl border p-4 text-center"
              >
                <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
                <p className={`text-2xl font-bold ${s.color}`}>{s.value.toLocaleString("en-US")}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setStep("upload"); setRows([]); setResults([]); }}>
              <Upload className="w-4 h-4 ml-2" /> رفع ملف جديد
            </Button>
            <Button variant="outline" onClick={() => setShowDetails(!showDetails)}>
              {showDetails ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
              {showDetails ? "إخفاء التفاصيل" : "عرض التفاصيل"}
            </Button>
          </div>

          {/* Details table */}
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto rounded-xl border bg-card">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="p-3 text-right font-medium">Reference</th>
                        <th className="p-3 text-right font-medium">الطلب</th>
                        <th className="p-3 text-right font-medium">الحالة القديمة</th>
                        <th className="p-3 text-right font-medium">الحالة الجديدة</th>
                        <th className="p-3 text-right font-medium">التحديث</th>
                        <th className="p-3 text-right font-medium">واتساب</th>
                        <th className="p-3 text-right font-medium">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {results.map((r, i) => (
                        <tr key={i} className={`hover:bg-muted/30 ${r.error ? "bg-red-50/50" : ""}`}>
                          <td className="p-3 font-mono text-xs">{r.row.reference}</td>
                          <td className="p-3">
                            {r.orderId ? (
                              <span className="text-primary font-medium">#{r.orderNumber}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-3">
                            {r.oldStatus ? (
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.oldStatus] || ""}`}>
                                {statusLabels[r.oldStatus] || r.oldStatus}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="p-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.newStatus] || ""}`}>
                              {statusLabels[r.newStatus] || r.newStatus}
                            </span>
                          </td>
                          <td className="p-3">
                            {r.updated ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : r.orderId && !r.statusChanged ? (
                              <span className="text-xs text-muted-foreground">لم يتغير</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-3">
                            {r.whatsappSent ? (
                              <MessageCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-3 text-xs">
                            {r.error ? (
                              <span className="text-red-600">{r.error}</span>
                            ) : !r.orderId ? (
                              <span className="text-amber-600">غير موجود في النظام</span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

function Loader() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
    />
  );
}
