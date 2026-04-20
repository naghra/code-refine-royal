import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, response, lead_score, lead_quality } = await req.json();
    if (!order_id || typeof order_id !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "order_id is required" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const confirmedAt = new Date().toISOString();
    // response: "confirmed" (default) | "rejected" | "no_response"
    const userResponse = response === "rejected" || response === "no_response" ? response : "confirmed";
    const updatePayload: Record<string, unknown> = {
      confirmation_response: userResponse,
    };
    if (userResponse === "confirmed") {
      updatePayload.confirmed = true;
      updatePayload.confirmed_at = confirmedAt;
    } else {
      // Keep confirmed=false; just record the response
      updatePayload.confirmed = false;
    }

    // Lead scoring (optional)
    if (typeof lead_score === "number" && lead_score >= 0 && lead_score <= 100) {
      updatePayload.lead_score = Math.round(lead_score);
    }
    if (lead_quality === "high_intent" || lead_quality === "warm_lead") {
      updatePayload.lead_quality = lead_quality;
    }

    const { data: cloakingSetting } = await supabaseAdmin
      .from("store_settings")
      .select("value")
      .eq("key", "app_config_cloaking")
      .maybeSingle();

    const cfg = cloakingSetting?.value as any;
    const hasExternalSync = !!(cfg?.sync_orders && cfg?.supabase_url && cfg?.supabase_service_role_key);

    // Update local if present
    const { data: localData, error: localErr } = await supabaseAdmin
      .from("orders")
      .update(updatePayload)
      .eq("id", order_id)
      .select("id")
      .maybeSingle();

    if (localErr) console.error("Local confirm error:", localErr);

    let externalUpdated = false;

    if (hasExternalSync) {
      const extUrl = cfg.supabase_url.replace(/\/$/, "");
      const extKey = cfg.supabase_service_role_key;
      // External DB may not have lead_score/lead_quality columns — send only confirmation fields
      const externalPayload: Record<string, unknown> = {
        confirmation_response: updatePayload.confirmation_response,
        confirmed: updatePayload.confirmed,
      };
      if (updatePayload.confirmed_at) externalPayload.confirmed_at = updatePayload.confirmed_at;

      const res = await fetch(`${extUrl}/rest/v1/orders?id=eq.${order_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: extKey,
          Authorization: `Bearer ${extKey}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify(externalPayload),
      });
      if (res.ok) {
        externalUpdated = true;
        const rows = await res.json().catch(() => []);
        const externalOrder = Array.isArray(rows) ? rows[0] : null;

        if (externalOrder) {
          // Merge lead scoring fields locally (external DB doesn't store them)
          const localOrderRow = {
            ...externalOrder,
            lead_score: updatePayload.lead_score ?? externalOrder.lead_score ?? null,
            lead_quality: updatePayload.lead_quality ?? externalOrder.lead_quality ?? null,
          };
          const { error: mirrorErr } = await supabaseAdmin
            .from("orders")
            .upsert(localOrderRow, { onConflict: "id" });

          if (mirrorErr) {
            console.error("Local mirror upsert error:", mirrorErr);
          } else {
            const extItemsRes = await fetch(`${extUrl}/rest/v1/order_items?order_id=eq.${order_id}&select=*`, {
              headers: {
                apikey: extKey,
                Authorization: `Bearer ${extKey}`,
              },
            });

            if (extItemsRes.ok) {
              const externalItems = await extItemsRes.json().catch(() => []);
              await supabaseAdmin.from("order_items").delete().eq("order_id", order_id);
              if (Array.isArray(externalItems) && externalItems.length > 0) {
                const { error: itemsMirrorErr } = await supabaseAdmin
                  .from("order_items")
                  .insert(externalItems);
                if (itemsMirrorErr) console.error("Local order items mirror error:", itemsMirrorErr);
              }
            }
          }
        }
      } else {
        const errTxt = await res.text().catch(() => "");
        console.error("External confirm failed:", res.status, errTxt);
      }
    }

    if (localData && externalUpdated) {
      console.log(`Order ${order_id} confirmed locally and externally`);
      return new Response(
        JSON.stringify({ success: true, source: "both" }),
        { headers: jsonHeaders }
      );
    }

    if (localData) {
      console.log(`Order ${order_id} confirmed locally`);
      return new Response(
        JSON.stringify({ success: true, source: "local" }),
        { headers: jsonHeaders }
      );
    }

    if (externalUpdated) {
      console.log(`Order ${order_id} confirmed externally and mirrored locally`);
      return new Response(
        JSON.stringify({ success: true, source: "external" }),
        { headers: jsonHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Order not found" }),
      { status: 404, headers: jsonHeaders }
    );
  } catch (err) {
    console.error("confirm-order error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
