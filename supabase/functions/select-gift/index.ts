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
    const { order_id, sku } = await req.json();

    if (!order_id || typeof order_id !== "string" || order_id.length < 10) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid order_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!sku || typeof sku !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid gift SKU" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate SKU against gifts table (always local)
    const { data: gift, error: giftErr } = await supabase
      .from("gifts")
      .select("id, name, sku, is_active")
      .eq("sku", sku)
      .eq("is_active", true)
      .maybeSingle();

    if (giftErr || !gift) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or inactive gift SKU" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine if order is local or external
    const { data: localOrder } = await supabase
      .from("orders")
      .select("id, gift_sku")
      .eq("id", order_id)
      .maybeSingle();

    let isExternal = false;
    let extUrl = "";
    let extKey = "";

    if (!localOrder) {
      // Check external DB config
      const { data: cloakingSetting } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "app_config_cloaking")
        .maybeSingle();

      const config = cloakingSetting?.value as any;
      if (config?.sync_orders && config?.supabase_url && config?.supabase_service_role_key) {
        extUrl = config.supabase_url.replace(/\/$/, "");
        extKey = config.supabase_service_role_key;

        // Verify order exists externally
        const extRes = await fetch(
          `${extUrl}/rest/v1/orders?id=eq.${order_id}&select=id,gift_sku`,
          { headers: { apikey: extKey, Authorization: `Bearer ${extKey}` } }
        );

        if (extRes.ok) {
          const rows = await extRes.json();
          if (rows && rows.length > 0) {
            if (rows[0].gift_sku) {
              return new Response(
                JSON.stringify({ success: false, error: "Gift already selected" }),
                { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
            isExternal = true;
          }
        }

        if (!isExternal) {
          return new Response(
            JSON.stringify({ success: false, error: "Order not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ success: false, error: "Order not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      if (localOrder.gift_sku) {
        return new Response(
          JSON.stringify({ success: false, error: "Gift already selected" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const giftPayload = {
      gift_sku: sku,
      gift_name: gift.name,
      gift_selected_at: new Date().toISOString(),
    };

    if (isExternal) {
      // Update external order
      const updateRes = await fetch(
        `${extUrl}/rest/v1/orders?id=eq.${order_id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: extKey,
            Authorization: `Bearer ${extKey}`,
            Prefer: "return=minimal",
          },
          body: JSON.stringify(giftPayload),
        }
      );

      if (!updateRes.ok) {
        const errText = await updateRes.text().catch(() => "");
        console.error("External gift update failed:", updateRes.status, errText);
        throw new Error("Failed to update external order");
      }
    } else {
      // Update local order
      const { error: updateErr } = await supabase
        .from("orders")
        .update(giftPayload)
        .eq("id", order_id);

      if (updateErr) throw updateErr;

      // Add gift as order item with price 0 (local only)
      const { error: itemErr } = await supabase
        .from("order_items")
        .insert({
          order_id,
          product_name: `🎁 ${gift.name} (${sku})`,
          quantity: 1,
          unit_price: 0,
          total_price: 0,
        });

      if (itemErr) {
        console.error("Failed to insert gift order item:", itemErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("select-gift error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
