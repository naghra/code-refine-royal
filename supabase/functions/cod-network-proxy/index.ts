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
      return new Response(JSON.stringify({ success: false, status: 400, error: "Missing API token" }), {
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
    const getDateRange = (q?: string): { from: string; to: string } | null => {
      if (!q) return null;
      const u = new URLSearchParams(q);
      const from = u.get("date_from") || u.get("from");
      const to = u.get("date_to") || u.get("to");
      return from && to ? { from, to } : null;
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
        const url = `${COD_NETWORK_HOST}${path}?${extra}${extra ? "&" : ""}limit=500&page=${page}`;
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
    const dateOnly = (v: any): string => String(v || "").slice(0, 10);
    const itemDate = (it: any, fields: string[]): string => {
      for (const f of fields) {
        const d = dateOnly(it?.[f]);
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
      }
      return "";
    };
    const fetchItemsByEventDate = async (
      statusQuery: string,
      range: { from: string; to: string } | null,
      dateFields: string[],
      maxPages = 60,
    ): Promise<any[]> => {
      if (!range) return fetchAllPages("/api/v2/seller/orders", statusQuery, maxPages);
      const out: any[] = [];
      let page = 1;
      while (page <= maxPages) {
        const url = `${COD_NETWORK_HOST}/api/v2/seller/orders?${statusQuery}&limit=500&page=${page}`;
        const res = await fetch(url, { method: "GET", headers: authHeaders });
        if (!res.ok) break;
        const j = await res.json().catch(() => ({}));
        const items: any[] = Array.isArray(j?.data) ? j.data : [];
        for (const it of items) {
          const d = itemDate(it, dateFields);
          if (d >= range.from && d <= range.to) out.push(it);
        }
        const dated = items.map((it) => itemDate(it, dateFields)).filter(Boolean);
        const allOlder = dated.length > 0 && dated.every((d) => d < range.from);
        const pag = j?.meta?.pagination;
        if (!pag || pag.current_page >= pag.total_pages || items.length === 0 || allOlder) break;
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
        const range = getDateRange(typeof body.query === "string" ? body.query : "");
        const [shippedItems, processingItems, deliveredItems, returnedItems] = await Promise.all([
          fetchItemsByEventDate("status=8", range, ["updated_at", "shipped_at", "created_at"], 60),
          fetchItemsByEventDate("status=2", range, ["updated_at", "created_at"], 60),
          fetchItemsByEventDate("status=delivered", range, ["delivered_at", "updated_at"], 60),
          fetchItemsByEventDate("status=5", range, ["returned_at", "updated_at"], 60),
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
          shipped_orders: shippedItems.length,
          processing_orders: processingItems.length,
          delivered_orders: deliveredItems.length,
          returned_orders: returnedItems.length,
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
      // ====== Statistics (per-product performance) ======
      if (sectionKey === "statistics") {
        // The COD V2 API does not expose a per-product statistics endpoint
        // (probed: /statistics, /products/statistics, /dashboard/statistics
        // all return 404). We aggregate from leads in the chosen date range.
        // The lead `products` field is a comma-separated string of
        // "Product Name/SKU" entries — we parse it to bucket per SKU.
        const range = getDateRange(typeof body.query === "string" ? body.query : "");
        // Hard cap pages to keep the function fast. With limit=500 this is
        // 15k leads max, plenty for any selected day/week/month.
        const MAX_PAGES = 30;
        const leads: any[] = [];
        let page = 1;
        let lastStatus = 200;
        while (page <= MAX_PAGES) {
          const url = `${COD_NETWORK_HOST}/api/v2/seller/leads?${dateQ}${dateQ ? "&" : ""}limit=500&page=${page}`;
          const res = await fetch(url, { method: "GET", headers: authHeaders });
          lastStatus = res.status;
          if (!res.ok) break;
          const j = await res.json().catch(() => ({}));
          const items: any[] = Array.isArray(j?.data) ? j.data : [];
          leads.push(...items);
          const pag = j?.meta?.pagination;
          if (!pag || pag.current_page >= pag.total_pages || items.length === 0) break;
          // If no date range was given, stop after first page to avoid huge pulls.
          if (!range && page >= 1) break;
          page++;
        }

        const parseSkus = (l: any): { sku: string; name: string }[] => {
          const raw = l?.products;
          if (!raw) return [];
          // Some accounts return arrays of objects; handle both shapes.
          if (Array.isArray(raw)) {
            return raw
              .map((p: any) => ({
                sku: String(p?.sku || "—"),
                name: String(p?.name || p?.title || "—"),
              }))
              .filter((p) => p.sku !== "—");
          }
          if (typeof raw === "string") {
            return raw.split(",").map((part) => {
              const seg = part.trim();
              const idx = seg.lastIndexOf("/");
              if (idx === -1) return { sku: seg || "—", name: seg || "—" };
              return { sku: seg.slice(idx + 1).trim(), name: seg.slice(0, idx).trim() };
            }).filter((p) => p.sku);
          }
          return [];
        };

        const map = new Map<string, any>();
        for (const l of leads) {
          const statusVal = String(
            (l?.status && (l.status.code || l.status.label)) || l?.status || "",
          ).toLowerCase();
          const isConfirmed = statusVal.includes("confirm");
          const isDelivered = statusVal.includes("deliver");
          for (const { sku, name } of parseSkus(l)) {
            const row =
              map.get(sku) ||
              {
                sku,
                name,
                total_lead_count: 0,
                confirmed_leads_count: 0,
                delivered_leads_count: 0,
                confirmed_lead_rate: 0,
                delivered_lead_rate: 0,
              };
            row.total_lead_count += 1;
            if (isConfirmed) row.confirmed_leads_count += 1;
            if (isDelivered) row.delivered_leads_count += 1;
            map.set(sku, row);
          }
        }
        for (const r of map.values()) {
          r.confirmed_lead_rate = r.total_lead_count
            ? Math.round((r.confirmed_leads_count / r.total_lead_count) * 1000) / 10
            : 0;
          r.delivered_lead_rate = r.total_lead_count
            ? Math.round((r.delivered_leads_count / r.total_lead_count) * 1000) / 10
            : 0;
        }
        const statsItems = Array.from(map.values()).sort(
          (a, b) => b.total_lead_count - a.total_lead_count,
        );

        return new Response(
          JSON.stringify({
            success: true,
            status: lastStatus,
            data: {
              items: statsItems,
              total: statsItems.length,
              meta: { leads_scanned: leads.length, range },
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

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
      // Special-case: invoices — fetch ALL pages so the UI shows every invoice.
      if (sectionKey === "invoices") {
        const basePath = "/api/v2/seller/invoices";
        const all: any[] = [];
        let page = 1;
        let lastStatus = 200;
        let lastOk = true;
        let total = 0;
        const maxPages = 50;
        while (page <= maxPages) {
          const params = new URLSearchParams(body.query || "");
          params.set("include", "details");
          params.set("limit", "100");
          params.set("page", String(page));
          const url = `${COD_NETWORK_HOST}${basePath}?${params.toString()}`;
          const res = await fetch(url, { method: "GET", headers: authHeaders });
          lastStatus = res.status;
          lastOk = res.ok;
          const j = await res.json().catch(() => ({}));
          const items: any[] = Array.isArray(j?.data) ? j.data : [];
          all.push(...items);
          const pag = j?.meta?.pagination;
          total = pag?.total ?? all.length;
          if (!pag || pag.current_page >= pag.total_pages || items.length === 0) break;
          page++;
        }
        return new Response(
          JSON.stringify({
            success: lastOk,
            status: lastStatus,
            data: { data: all, meta: { pagination: { total, count: all.length } } },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
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

    return new Response(JSON.stringify({ success: false, status: 400, error: "Unknown action" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("cod-network-proxy error:", err);
    return new Response(JSON.stringify({ success: false, status: 500, error: String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
