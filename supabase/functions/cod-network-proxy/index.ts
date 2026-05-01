import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// COD Network V2 API. Paths vary by section, so we use the bare host
// and let each call specify its own absolute path under the host.
const COD_NETWORK_HOST = "https://api.cod.network";
// V2 seller base. Verified working paths use the /api/v2/seller/* prefix.
const COD_NETWORK_API_BASE = "https://api.cod.network/api/v2/seller";

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
      // Verified via direct probe against api.cod.network.
      // Confirmed working: products, orders, leads, stocks, invoices,
      // stores, source-requests, marketplace/products, drop-products.
      // Dashboards/statistics/purchases endpoints are NOT exposed by V2 API,
      // so we synthesize them from leads/orders below.
      source_requests: "/api/v2/seller/source-requests",
      marketplace_products: "/api/v2/seller/marketplace/products",
      products: "/api/v2/seller/products",
      drop_products: "/api/v2/seller/drop-products",
      stocks: "/api/v2/seller/stocks",
      leads: "/api/v2/seller/leads",
      orders: "/api/v2/seller/orders",
      stores: "/api/v2/seller/stores",
      invoices: "/api/v2/seller/invoices?include=details",
    };

    // Synthetic sections that aggregate data from real endpoints.
    const SYNTHETIC_SECTIONS: Record<string, { source: string; filterStatus?: string[] }> = {
      confirmed_dashboard: { source: "/api/v2/seller/leads", filterStatus: ["confirmed"] },
      delivered_dashboard: { source: "/api/v2/seller/orders", filterStatus: ["delivered"] },
      statistics: { source: "/api/v2/seller/products" },
      purchases: { source: "/api/v2/seller/orders" },
    };

    if (action === "get_section" && body.section) {
      const sectionKey = body.section as string;

      // Synthetic section: fetch from a real endpoint and shape the payload.
      if (SYNTHETIC_SECTIONS[sectionKey]) {
        const { source, filterStatus } = SYNTHETIC_SECTIONS[sectionKey];
        const params = new URLSearchParams();
        if (filterStatus && filterStatus.length) {
          params.set("search", `status:${filterStatus.join(",")}`);
        }
        params.set("limit", "100");
        // Forward optional date filters from the client.
        if (typeof body.query === "string" && body.query.length) {
          for (const [k, v] of new URLSearchParams(body.query)) {
            params.set(k, v);
          }
        }
        const url = `${COD_NETWORK_HOST}${source}?${params.toString()}`;
        const res = await fetch(url, { method: "GET", headers: authHeaders });
        const raw = await res.json().catch(() => ({}));
        const items: any[] = Array.isArray(raw?.data) ? raw.data : [];
        const total = raw?.meta?.pagination?.total ?? items.length;
        // Build a simple stats object from items.
        const sumBy = (k: string) =>
          items.reduce((s, it) => s + (Number(it?.[k]) || 0), 0);
        const stats = {
          total,
          shown: items.length,
          total_amount: sumBy("total") || sumBy("amount") || sumBy("price"),
          shipping_cost: sumBy("shipping_cost"),
          profit: sumBy("profit") || sumBy("seller_profit"),
          by_status: items.reduce((acc: Record<string, number>, it) => {
            const s = String(it?.status || "unknown");
            acc[s] = (acc[s] || 0) + 1;
            return acc;
          }, {}),
        };
        return new Response(
          JSON.stringify({
            success: res.ok,
            status: res.status,
            data: { data: stats, items },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const path = SECTION_PATHS[sectionKey];
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
