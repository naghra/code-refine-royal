import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// COD Network V2 API. Paths vary by section, so we use the bare host
// and let each call specify its own absolute path under the host.
const COD_NETWORK_HOST = "https://api.cod.network";
// Legacy seller V1 base — kept for backwards compatibility with leads creation flow.
const COD_NETWORK_API_BASE = "https://api.cod.network/v2/seller";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, api_token, order_data } = body;

    if (!api_token) {
      return new Response(JSON.stringify({ success: false, error: "Missing API token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeaders = {
      Authorization: `Bearer ${api_token}`,
      "Content-Type": "application/json",
    };

    if (action === "test") {
      const res = await fetch(`${COD_NETWORK_API_BASE}/orders`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({}),
      });
      const success = res.status !== 401 && res.status !== 403;
      return new Response(JSON.stringify({ success, status: res.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Probe multiple candidate paths to find which ones the API actually serves.
    if (action === "probe") {
      const candidates: string[] = body.paths || [];
      const results = await Promise.all(
        candidates.map(async (p: string) => {
          try {
            const res = await fetch(`${COD_NETWORK_HOST}${p}`, {
              method: "GET",
              headers: authHeaders,
            });
            const text = await res.text();
            let preview = text.slice(0, 200);
            return { path: p, status: res.status, ok: res.ok, preview };
          } catch (e) {
            return { path: p, status: 0, ok: false, preview: String(e) };
          }
        }),
      );
      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_products") {
      // Fetch ALL pages of products
      const allProducts: any[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const res = await fetch(`${COD_NETWORK_API_BASE}/products?page=${page}`, {
          method: "GET",
          headers: authHeaders,
        });
        const data = await res.json().catch(() => ({}));
        
        if (!res.ok) {
          return new Response(JSON.stringify({ success: false, status: res.status, data }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const products = data?.data || [];
        allProducts.push(...products);

        // Check pagination
        const pagination = data?.meta?.pagination;
        if (pagination && pagination.current_page < pagination.total_pages) {
          page++;
        } else {
          hasMore = false;
        }
      }

      console.log(`CodNetwork: fetched ${allProducts.length} products across ${page} pages`);
      return new Response(JSON.stringify({ 
        success: true, 
        data: { data: allProducts, total: allProducts.length } 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // V2 Network Dashboard — paths verified against developer.cod.network/v2
    // ============================================================
    const SECTION_PATHS: Record<string, string> = {
      // All Seller V2 endpoints live under /v2/seller/...
      // Verified via probe: /v2/seller/products returns 401 (auth issue, path exists),
      // while /seller/products and /seller/v2/products return 404.
      confirmed_dashboard: "/v2/seller/confirmed-dashboard",
      delivered_dashboard: "/v2/seller/delivered-dashboard",
      source_requests: "/v2/seller/source-requests",
      purchases: "/v2/seller/order-requests",
      marketplace_products: "/v2/seller/marketplace/products",
      products: "/v2/seller/products",
      drop_products: "/v2/seller/drop-products",
      stocks: "/v2/seller/stocks",
      leads: "/v2/seller/leads",
      orders: "/v2/seller/orders",
      statistics: "/v2/seller/products/statistics",
      stores: "/v2/seller/stores",
      invoices: "/v2/seller/invoices?include=details",
    };

    if (action === "get_section" && body.section) {
      const path = SECTION_PATHS[body.section as string];
      if (!path) {
        return new Response(JSON.stringify({ success: false, error: "Unknown section" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const qs = body.query ? `?${body.query}` : "";
      const sep = path.includes("?") ? "&" : "?";
      const url = body.query
        ? `${COD_NETWORK_HOST}${path}${sep}${body.query}`
        : `${COD_NETWORK_HOST}${path}`;
      const res = await fetch(url, {
        method: "GET",
        headers: authHeaders,
      });
      const data = await res.json().catch(() => ({}));
      return new Response(
        JSON.stringify({ success: res.ok, status: res.status, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetches all sections in parallel and returns counts/totals only.
    if (action === "get_dashboard") {
      const sections = Object.entries(SECTION_PATHS);
      const results = await Promise.all(
        sections.map(async ([key, path]) => {
          try {
            const sep = path.includes("?") ? "&" : "?";
            const res = await fetch(`${COD_NETWORK_HOST}${path}${sep}limit=1`, {
              method: "GET",
              headers: authHeaders,
            });
            const data = await res.json().catch(() => ({}));
            // Try to extract a meaningful count from common V2 shapes.
            // Dashboard endpoints return totals as direct fields, not arrays.
            const total =
              data?.meta?.pagination?.total ??
              data?.meta?.total ??
              data?.total ??
              data?.data?.total_leads_count ??
              data?.data?.total_new_leads_count ??
              data?.data?.delivered_orders ??
              data?.data?.shipped_orders ??
              (Array.isArray(data?.data) ? data.data.length : null);
            return {
              key,
              ok: res.ok,
              status: res.status,
              total,
              sample: data?.data ?? data ?? null,
            };
          } catch (e) {
            return { key, ok: false, status: 0, total: null, error: String(e) };
          }
        }),
      );
      return new Response(
        JSON.stringify({ success: true, sections: results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "get_lead" && body.lead_id) {
      // V2: fetch lead with related order, items, history in one request via include=
      const leadRes = await fetch(
        `${COD_NETWORK_API_BASE}/leads/${body.lead_id}?include=order,items,history`,
        { method: "GET", headers: authHeaders }
      );
      const leadData = await leadRes.json().catch(() => ({}));

      // Also fetch orders matching this lead (V2 supports search by lead_id)
      const orderRes = await fetch(
        `${COD_NETWORK_API_BASE}/orders?search=lead_id:${body.lead_id}&include=items,history`,
        { method: "GET", headers: authHeaders }
      );
      const orderData = await orderRes.json().catch(() => ({}));
      console.log("CodNetwork get_lead:", leadRes.status, "get_order:", orderRes.status, "lead_id:", body.lead_id);

      // Merge: prefer lead data for status, attach order data for shipment info
      const lead = leadRes.ok ? leadData?.data : null;
      // V2 may already embed the order via include=order. Fall back to /orders results.
      const embeddedOrder = lead && (lead as any).order ? (lead as any).order : null;
      const ordersArr = orderRes.ok && Array.isArray(orderData?.data) ? orderData.data : [];
      const matchedFromList = ordersArr.find((o: any) => String(o.lead_id) === String(body.lead_id)) || null;
      const order = embeddedOrder || matchedFromList;
      if (ordersArr.length > 0 && !order) {
        console.log("CodNetwork: orders returned but none matched lead_id", body.lead_id, "got lead_ids:", ordersArr.map((o: any) => o.lead_id));
      }
      
      if (lead || order) {
        const merged = {
          ...(lead || {}),
          order: order || null,
        };
        return new Response(JSON.stringify({ success: true, data: { data: merged } }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ success: false, status: leadRes.status, data: leadData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send_order" && order_data) {
      console.log("CodNetwork lead_data:", JSON.stringify(order_data));
      const res = await fetch(`${COD_NETWORK_API_BASE}/leads`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(order_data),
      });
      const data = await res.json().catch(() => ({}));
      console.log("CodNetwork lead response:", res.status, JSON.stringify(data));
      return new Response(JSON.stringify({ success: res.ok, status: res.status, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("cod-network-proxy error:", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
