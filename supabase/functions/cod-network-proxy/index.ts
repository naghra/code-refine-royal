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
    // status values are passed as the V2 API expects: ?status=<text>
    const SYNTHETIC_SECTIONS: Record<string, { source: string; status?: string }> = {
      confirmed_dashboard: { source: "/api/v2/seller/leads", status: "confirmed" },
      delivered_dashboard: { source: "/api/v2/seller/orders", status: "delivered" },
      statistics: { source: "/api/v2/seller/products" },
      purchases: { source: "/api/v2/seller/orders" },
    };

    // -----------------------------------------------------------
    // Helpers used by synthetic dashboards.
    // -----------------------------------------------------------
    const buildDateQuery = (q?: string): string => {
      if (!q) return "";
      const u = new URLSearchParams(q);
      const out = new URLSearchParams();
      const f = u.get("date_from") || u.get("from");
      const t = u.get("date_to") || u.get("to");
      if (f) out.set("date_from", f);
      if (t) out.set("date_to", t);
      return out.toString();
    };
    const countOnly = async (path: string, extra: string): Promise<number> => {
      const url = `${COD_NETWORK_HOST}${path}?${extra}${extra ? "&" : ""}limit=1&per_page=1`;
      const res = await fetch(url, { method: "GET", headers: authHeaders });
      if (!res.ok) return 0;
      const j = await res.json().catch(() => ({}));
      return Number(j?.meta?.pagination?.total) || 0;
    };
    const fetchAllPages = async (path: string, extra: string, maxPages = 25): Promise<any[]> => {
      const out: any[] = [];
      let page = 1;
      while (page <= maxPages) {
        const url = `${COD_NETWORK_HOST}${path}?${extra}${extra ? "&" : ""}per_page=200&page=${page}`;
        const res = await fetch(url, { method: "GET", headers: authHeaders });
        if (!res.ok) break;
        const j = await res.json().catch(() => ({}));
        const items: any[] = Array.isArray(j?.data) ? j.data : [];
        out.push(...items);
        const pag = j?.meta?.pagination;
        if (!pag || pag.current_page >= pag.total_pages || items.length === 0) break;
        page++;
      }
      return out;
    };
    const num = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    if (action === "get_section" && body.section) {
      const sectionKey = body.section as string;
      const dateQ = buildDateQuery(typeof body.query === "string" ? body.query : "");

      // ====== Confirmed Dashboard (Leads) ======
      if (sectionKey === "confirmed_dashboard") {
        const leadStatuses = [
          { key: "total_leads_count", label: "Total leads", q: "" },
          { key: "total_new_leads_count", label: "New leads", q: "status=new" },
          { key: "total_confirmed_leads_count", label: "Confirmed", q: "status=confirmed" },
          { key: "total_processing_leads_count", label: "Processing", q: "status=processing" },
          { key: "total_no_reply_leads_count", label: "No reply", q: "status=no_reply" },
          { key: "total_canceled_leads_count", label: "Cancelled", q: "status=cancelled" },
          { key: "total_wrong_leads_count", label: "Wrong", q: "status=wrong" },
          { key: "total_expired_leads_count", label: "Expired", q: "status=expired" },
          { key: "total_call_later_scheduled_leads_count", label: "Call later", q: "status=call_later" },
        ];
        const counts = await Promise.all(
          leadStatuses.map((s) =>
            countOnly("/api/v2/seller/leads", [s.q, dateQ].filter(Boolean).join("&")),
          ),
        );
        const stats: Record<string, number> = {};
        leadStatuses.forEach((s, i) => (stats[s.key] = counts[i]));
        return new Response(
          JSON.stringify({ success: true, status: 200, data: { data: stats } }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // ====== Delivered Dashboard (Orders) ======
      if (sectionKey === "delivered_dashboard") {
        // Status counts (all in parallel — uses meta.total only, fast).
        const statuses = [
          { key: "shipped_orders", q: "status=8" },         // Pending = shipped/in transit
          { key: "processing_orders", q: "status=2" },      // Assigned
          { key: "delivered_orders", q: "status=delivered" },
          { key: "returned_orders", q: "status=5" },        // Return
        ];
        const [counts, deliveredItems] = await Promise.all([
          Promise.all(
            statuses.map((s) =>
              countOnly("/api/v2/seller/orders", [s.q, dateQ].filter(Boolean).join("&")),
            ),
          ),
          // Pull delivered orders to compute money fields.
          fetchAllPages(
            "/api/v2/seller/orders",
            ["status=delivered", dateQ].filter(Boolean).join("&"),
            25,
          ),
        ]);

        const sumBy = (k: string) => deliveredItems.reduce((s, it) => s + num(it?.[k]), 0);
        const sales = sumBy("total");
        const shipping_cost = sumBy("shipping_fees");
        const delivery_cost = sumBy("delivery_fees");
        // VAT estimate (most countries 0 unless API exposes it)
        const vat = deliveredItems.reduce((s, it) => s + num(it?.vat) + num(it?.tax), 0);
        // COD fees: typically a % of total. Use field if present, otherwise 5% of sales as fallback.
        const cod_fees =
          deliveredItems.reduce((s, it) => s + num(it?.cod_fees) + num(it?.cod_fee), 0) ||
          Math.round(sales * 0.05 * 100) / 100;

        const stats = {
          shipped_orders: counts[0],
          processing_orders: counts[1],
          delivered_orders: counts[2],
          returned_orders: counts[3],
          sales: Math.round(sales * 100) / 100,
          shipping_cost: Math.round(shipping_cost * 100) / 100,
          delivery_cost: Math.round(delivery_cost * 100) / 100,
          vat: Math.round(vat * 100) / 100,
          cod_fees,
          // Profit = sales − (shipping + delivery + vat + cod_fees)
          profits:
            Math.round((sales - shipping_cost - delivery_cost - vat - cod_fees) * 100) /
            100,
        };
        return new Response(
          JSON.stringify({ success: true, status: 200, data: { data: stats } }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Other synthetic sections (statistics, purchases) keep old behavior.
      if (SYNTHETIC_SECTIONS[sectionKey]) {
        const { source, status: defaultStatus } = SYNTHETIC_SECTIONS[sectionKey];
        const params = new URLSearchParams();
        // Forward optional filters from the client (date_from/date_to/status/...).
        if (typeof body.query === "string" && body.query.length) {
          for (const [k, v] of new URLSearchParams(body.query)) {
            params.set(k, v);
          }
        }
        if (defaultStatus && !params.has("status")) {
          params.set("status", defaultStatus);
        }
        params.set("per_page", "200");

        // Fetch up to N pages so totals/sums reflect the real dataset, not just page 1.
        const MAX_PAGES = 25; // 25 * 200 = 5000 rows max — enough for monthly stats
        const aggregated: any[] = [];
        let page = 1;
        let totalFromMeta = 0;
        let lastStatus = 200;
        let lastOk = true;
        while (page <= MAX_PAGES) {
          params.set("page", String(page));
          const url = `${COD_NETWORK_HOST}${source}?${params.toString()}`;
          const res = await fetch(url, { method: "GET", headers: authHeaders });
          lastStatus = res.status;
          lastOk = res.ok;
          const raw = await res.json().catch(() => ({}));
          const items: any[] = Array.isArray(raw?.data) ? raw.data : [];
          aggregated.push(...items);
          const pag = raw?.meta?.pagination;
          totalFromMeta = pag?.total ?? aggregated.length;
          if (!pag || pag.current_page >= pag.total_pages || items.length === 0) break;
          page++;
        }

        const num = (v: any) => {
          const n = Number(v);
          return Number.isFinite(n) ? n : 0;
        };
        const sumBy = (k: string) => aggregated.reduce((s, it) => s + num(it?.[k]), 0);
        const statusLabel = (it: any) => {
          const s = it?.status;
          if (s && typeof s === "object") return s.label || s.code || "unknown";
          return s || "unknown";
        };
        const stats = {
          total: totalFromMeta,
          shown: aggregated.length,
          pages_fetched: page,
          total_amount: sumBy("total") || sumBy("amount") || sumBy("price"),
          total_amount_usd: sumBy("total_usd"),
          shipping_cost: sumBy("shipping_fees") || sumBy("shipping_cost"),
          delivery_fees: sumBy("delivery_fees"),
          profit: sumBy("profit") || sumBy("seller_profit"),
          by_status: aggregated.reduce((acc: Record<string, number>, it) => {
            const s = String(statusLabel(it));
            acc[s] = (acc[s] || 0) + 1;
            return acc;
          }, {}),
          by_country: aggregated.reduce((acc: Record<string, number>, it) => {
            const c = String(it?.customer_country_name || it?.country || "unknown");
            acc[c] = (acc[c] || 0) + 1;
            return acc;
          }, {}),
        };
        return new Response(
          JSON.stringify({
            success: lastOk,
            status: lastStatus,
            data: { data: stats, items: aggregated.slice(0, 100) },
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
