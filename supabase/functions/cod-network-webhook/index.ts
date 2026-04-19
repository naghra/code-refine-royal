import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Normalize status: lowercase, replace spaces with underscores
function normalizeStatus(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "_");
}

// Map CodNetwork lead statuses to our order statuses
const LEAD_STATUS_MAP: Record<string, string> = {
  lead: "pending",
  confirmed: "confirmed",
  delivered: "delivered",
  return: "refunded",
  call_later: "pending",
  call_later_scheduled: "pending",
  no_reply: "pending",
  cancelled: "cancelled",
  wrong: "cancelled",
  expired: "cancelled",
};

// Map CodNetwork order statuses to our order statuses
const ORDER_STATUS_MAP: Record<string, string> = {
  new: "pending",
  "assigned(order_sent_to_shipping_company)": "shipped",
  shipped: "shipped",
  delivered: "delivered",
  returned: "refunded",
  cancelled: "cancelled",
  on_hold: "pending",
  scheduled: "pending",
};

// Normalize phone: strip country code prefix, ensure starts with 0
function normalizePhone(phone: string): string {
  let p = phone.replace(/[\s\-\+]/g, "");
  if (p.startsWith("966")) p = p.slice(3);
  if (!p.startsWith("0")) p = "0" + p;
  return p;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    const webhookSecret = Deno.env.get("COD_NETWORK_WEBHOOK_SECRET");
    if (webhookSecret) {
      const authHeader = req.headers.get("x-webhook-secret") || req.headers.get("authorization");
      const querySecret = url.searchParams.get("secret");
      const providedSecret = querySecret || authHeader?.replace("Bearer ", "");
      if (providedSecret && providedSecret !== webhookSecret) {
        console.log("CodNetwork webhook: invalid secret provided");
        return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const webhookType = url.searchParams.get("type") || "lead";

    const body = await req.json();
    console.log(`CodNetwork webhook [${webhookType}] received:`, JSON.stringify(body));

    const codStatus = body.status;
    if (!codStatus) {
      // Return 200 to prevent CodNetwork from disabling webhook
      return new Response(JSON.stringify({ success: false, error: "Missing status" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const leadId = body.lead_id || body.id;
    const rawPhone = body.phone || body.customer_phone;
    const normalizedPhone = rawPhone ? normalizePhone(rawPhone) : null;

    // Build the incoming cod_network_status string early for dedup check
    const normalizedKey = normalizeStatus(codStatus);
    const incomingCodStatus = webhookType === "order" ? `order:${codStatus}` : `lead:${codStatus}`;

    let matchedOrder: { id: string; cod_network_data: Record<string, any> | null; cod_network_status: string | null } | null = null;
    let orderId: string | null = null;

    // 1. Match by lead_id
    if (leadId) {
      const { data } = await supabaseAdmin
        .from("orders")
        .select("id, cod_network_data, cod_network_status")
        .eq("cod_network_lead_id", String(leadId))
        .maybeSingle();
      if (data) {
        matchedOrder = data;
        orderId = data.id;
      }
    }

    // 2. Match by normalized phone (most recent)
    if (!orderId && normalizedPhone) {
      const { data } = await supabaseAdmin
        .from("orders")
        .select("id, cod_network_data, cod_network_status")
        .eq("customer_phone", normalizedPhone)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        matchedOrder = data;
        orderId = data.id;
      }
    }

    if (!orderId) {
      console.log("CodNetwork webhook: no matching order found for", { leadId, rawPhone, normalizedPhone });
      return new Response(JSON.stringify({ success: false, error: "Order not found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // NOTE: We intentionally do NOT skip duplicate updates.
    // Every webhook from CodNetwork is applied, even if the status is unchanged,
    // to ensure no update is ever lost or ignored.
    if (matchedOrder?.cod_network_status === incomingCodStatus) {
      console.log(`CodNetwork webhook: re-applying (status unchanged: ${incomingCodStatus}) for order ${orderId}`);
    }

    // Map status
    const statusMap = webhookType === "order" ? ORDER_STATUS_MAP : LEAD_STATUS_MAP;
    const mappedStatus = statusMap[normalizedKey] || null;
    const existingCodData = matchedOrder?.cod_network_data && typeof matchedOrder.cod_network_data === "object"
      ? matchedOrder.cod_network_data
      : {};
    const isNewOrderWebhook = webhookType === "order" && normalizedKey === "new";

    const updateData: Record<string, any> = {};
    if (leadId) updateData.cod_network_lead_id = String(leadId);

    if (webhookType === "order") {
      updateData.cod_network_data = {
        ...existingCodData,
        order: body,
      };
      if (!isNewOrderWebhook || !existingCodData.status) {
        updateData.cod_network_status = incomingCodStatus;
        if (mappedStatus) updateData.status = mappedStatus;
      }
    } else {
      updateData.cod_network_status = incomingCodStatus;
      updateData.cod_network_data = {
        ...existingCodData,
        ...body,
        order: existingCodData.order ?? null,
      };
      if (mappedStatus) updateData.status = mappedStatus;
    }

    const { error } = await supabaseAdmin
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    if (error) {
      console.error("CodNetwork webhook update error:", error);
      return new Response(JSON.stringify({ success: false, error: "Update failed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`CodNetwork webhook [${webhookType}]: updated order ${orderId} → ${codStatus} (mapped: ${mappedStatus})`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("CodNetwork webhook error:", err);
    // Return 200 even on error to prevent webhook disabling
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});