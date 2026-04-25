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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const userId = userRes?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read cloaking config
    const { data: cloakingSetting } = await supabaseAdmin
      .from("store_settings")
      .select("value")
      .eq("key", "app_config_cloaking")
      .maybeSingle();

    const cfg = cloakingSetting?.value as any;
    const useExternal = !!(cfg?.sync_orders && cfg?.supabase_url && cfg?.supabase_service_role_key);

    if (!useExternal) {
      const { data, error } = await supabaseAdmin
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true, source: "local", orders: data || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const extUrl = String(cfg.supabase_url).replace(/\/$/, "");
    const extKey = cfg.supabase_service_role_key;

    // Fetch external orders with pagination via Range header
    const all: any[] = [];
    const PAGE = 1000;
    let from = 0;
    while (true) {
      const to = from + PAGE - 1;
      const res = await fetch(
        `${extUrl}/rest/v1/orders?select=*&order=created_at.desc`,
        {
          headers: {
            apikey: extKey,
            Authorization: `Bearer ${extKey}`,
            Range: `${from}-${to}`,
            "Range-Unit": "items",
            Prefer: "count=exact",
          },
        }
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("External fetch failed:", res.status, txt);
        return new Response(
          JSON.stringify({ success: false, error: "External fetch failed" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const rows = await res.json();
      all.push(...rows);
      if (!rows.length || rows.length < PAGE) break;
      from += PAGE;
      if (all.length >= 10000) break; // safety cap
    }

    return new Response(
      JSON.stringify({ success: true, source: "external", orders: all }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("list-orders error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});