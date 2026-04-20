import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { product_id } = await req.json();
    if (!product_id || typeof product_id !== "string") {
      return new Response(JSON.stringify({ success: false, error: "product_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ success: false, error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load cloaking config
    const { data: cloakingSetting } = await supabase
      .from("store_settings")
      .select("value")
      .eq("key", "app_config_cloaking")
      .maybeSingle();
    const cfg = cloakingSetting?.value as any;
    if (!cfg?.sync_orders || !cfg?.supabase_url || !cfg?.supabase_service_role_key) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "External DB not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load local product
    const { data: product, error: prodErr } = await supabase
      .from("products")
      .select("*")
      .eq("id", product_id)
      .maybeSingle();
    if (prodErr || !product) {
      return new Response(JSON.stringify({ success: false, error: "Product not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extUrl = cfg.supabase_url.replace(/\/$/, "");
    const extKey = cfg.supabase_service_role_key;

    // Upsert to external DB (id-based)
    const upsertRes = await fetch(`${extUrl}/rest/v1/products?on_conflict=id`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: extKey,
        Authorization: `Bearer ${extKey}`,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(product),
    });

    if (!upsertRes.ok) {
      const errText = await upsertRes.text().catch(() => "");
      console.error("External upsert failed:", upsertRes.status, errText);
      return new Response(JSON.stringify({ success: false, error: errText || "External sync failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sync-product-to-external error:", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});