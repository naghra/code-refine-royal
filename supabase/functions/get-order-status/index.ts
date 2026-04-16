import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { order_id } = await req.json();

    if (!order_id || typeof order_id !== "string" || order_id.length < 10) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid order_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Try local DB first
    const { data, error } = await supabase
      .from("orders")
      .select("id, gift_sku, gift_name, total")
      .eq("id", order_id)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      return new Response(
        JSON.stringify({ success: true, order: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Not found locally — check if external DB is configured (cloaking mode)
    const { data: cloakingSetting } = await supabase
      .from("store_settings")
      .select("value")
      .eq("key", "app_config_cloaking")
      .maybeSingle();

    const config = cloakingSetting?.value as any;
    if (config?.sync_orders && config?.supabase_url && config?.supabase_service_role_key) {
      const extUrl = config.supabase_url.replace(/\/$/, "");
      const extKey = config.supabase_service_role_key;

      const extRes = await fetch(
        `${extUrl}/rest/v1/orders?id=eq.${order_id}&select=id,gift_sku,gift_name,total`,
        {
          headers: {
            apikey: extKey,
            Authorization: `Bearer ${extKey}`,
          },
        }
      );

      if (extRes.ok) {
        const rows = await extRes.json();
        if (rows && rows.length > 0) {
          return new Response(
            JSON.stringify({ success: true, order: rows[0], source: "external" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: "Order not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("get-order-status error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
