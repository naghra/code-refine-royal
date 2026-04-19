import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, response } = await req.json();
    if (!order_id || typeof order_id !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "order_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Try local first
    const { data: localData, error: localErr } = await supabaseAdmin
      .from("orders")
      .update(updatePayload)
      .eq("id", order_id)
      .select("id")
      .maybeSingle();

    if (localErr) console.error("Local confirm error:", localErr);

    if (localData) {
      console.log(`Order ${order_id} confirmed locally`);
      return new Response(
        JSON.stringify({ success: true, source: "local" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback: external supabase
    const { data: cloakingSetting } = await supabaseAdmin
      .from("store_settings")
      .select("value")
      .eq("key", "app_config_cloaking")
      .maybeSingle();

    const cfg = cloakingSetting?.value as any;
    if (cfg?.sync_orders && cfg?.supabase_url && cfg?.supabase_service_role_key) {
      const extUrl = cfg.supabase_url.replace(/\/$/, "");
      const extKey = cfg.supabase_service_role_key;
      const res = await fetch(`${extUrl}/rest/v1/orders?id=eq.${order_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: extKey,
          Authorization: `Bearer ${extKey}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify(updatePayload),
      });
      if (res.ok) {
        console.log(`Order ${order_id} confirmed externally`);
        return new Response(
          JSON.stringify({ success: true, source: "external" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errTxt = await res.text().catch(() => "");
      console.error("External confirm failed:", res.status, errTxt);
    }

    return new Response(
      JSON.stringify({ success: false, error: "Order not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("confirm-order error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
