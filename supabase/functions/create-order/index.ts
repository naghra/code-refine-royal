import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COD_NETWORK_API_BASE = "https://api.cod.network/v1/seller";

const CURRENCY_COUNTRY_MAP: Record<string, string> = {
  SAR: "KSA", AED: "ARE", KWD: "KWT", BHD: "BHR", QAR: "QAT",
  OMR: "OMN", EGP: "EGY", USD: "USA", EUR: "DEU", GBP: "GBR",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      customer_name,
      customer_phone,
      customer_email,
      city,
      address,
      payment_method = "cod",
      shipping_method = "standard",
      subtotal,
      shipping_cost = 0,
      total,
      user_id,
      items,
    } = await req.json();

    if (!customer_name || !customer_phone || !items?.length) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if external-only mode is enabled
    const { data: cloakingSetting } = await supabaseAdmin
      .from("store_settings")
      .select("value")
      .eq("key", "app_config_cloaking")
      .maybeSingle();

    const cloakingConfig = cloakingSetting?.value as any;
    const useExternalOnly = cloakingConfig?.sync_orders && cloakingConfig?.supabase_url && cloakingConfig?.supabase_service_role_key;

    const orderId = crypto.randomUUID();

    if (useExternalOnly) {
      // Save ONLY to external Supabase — skip local storage
      console.log("External-only mode: saving order to external Supabase only...");
      const extUrl = cloakingConfig.supabase_url.replace(/\/$/, "");
      const extKey = cloakingConfig.supabase_service_role_key;

      const orderPayload = {
        id: orderId,
        customer_name,
        customer_phone,
        customer_email: customer_email || null,
        city: city || null,
        address: address || null,
        payment_method,
        shipping_method,
        subtotal: subtotal || total,
        shipping_cost,
        total,
        status: "pending",
        items: items.map((item: any) => ({
          product_name: item.product_name,
          quantity: item.quantity || 1,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })),
      };

      const extRes = await fetch(`${extUrl}/rest/v1/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: extKey,
          Authorization: `Bearer ${extKey}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify(orderPayload),
      });

      if (!extRes.ok) {
        const errText = await extRes.text().catch(() => "");
        console.error("External Supabase insert failed:", extRes.status, errText);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to save order" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("Order saved to external Supabase successfully");
    } else {
      // Save locally (default behavior)
      const { error: orderError } = await supabaseAdmin
        .from("orders")
        .insert({
          id: orderId,
          customer_name,
          customer_phone,
          customer_email: customer_email || null,
          city: city || null,
          address: address || null,
          payment_method,
          shipping_method,
          subtotal: subtotal || total,
          shipping_cost,
          total,
          user_id: user_id || null,
        });

      if (orderError) {
        console.error("Order insert error:", orderError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create order" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Insert order items
      const orderItems = items.map((item: any) => ({
        order_id: orderId,
        product_id: item.product_id || null,
        product_name: item.product_name,
        quantity: item.quantity || 1,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      const { error: itemsError } = await supabaseAdmin
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error("Order items insert error:", itemsError);
      }
    }

    // Pushover notification (fire-and-forget)
    try {
      const PUSHOVER_TOKEN = Deno.env.get("PUSHOVER_TOKEN");
      const PUSHOVER_USER = Deno.env.get("PUSHOVER_USER");

      if (PUSHOVER_TOKEN && PUSHOVER_USER) {
        const firstItem = items[0];
        const message = `🔥 New Order\n\n👤 Name: ${customer_name}\n📞 Phone: ${customer_phone}\n📦 Product: ${firstItem.product_name}\n🔢 Qty: ${firstItem.quantity || 1}\n💰 Total: ${total}`;

        const pushRes = await fetch("https://api.pushover.net/1/messages.json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: PUSHOVER_TOKEN,
            user: PUSHOVER_USER,
            message,
            priority: 1,
            sound: "cashregister",
            title: "طلب جديد 🔔",
          }),
        });
        console.log("Pushover response:", pushRes.status);
      }
    } catch (pushErr) {
      console.error("Pushover notification failed:", pushErr);
    }

    // Auto-send to CodNetwork if enabled (fire-and-forget)
    try {
      const { data: codSetting } = await supabaseAdmin
        .from("store_settings")
        .select("value")
        .eq("key", "cod_network")
        .maybeSingle();

      const codConfig = codSetting?.value as any;
      if (codConfig?.enabled && codConfig?.auto_send && codConfig?.api_token) {
        console.log("Auto-sending order to CodNetwork...");

        // Fetch product SKUs and currency
        const productIds = items.map((i: any) => i.product_id).filter(Boolean);
        let skuMap: Record<string, string> = {};
        let productCurrencyCode: string | null = null;

        if (productIds.length > 0) {
          const { data: products } = await supabaseAdmin
            .from("products")
            .select("id, sku, currency_enabled, currency_code")
            .in("id", productIds);
          if (products) {
            skuMap = Object.fromEntries(products.map((p: any) => [p.id, p.sku || ""]));
            const withCurrency = products.find((p: any) => p.currency_enabled && p.currency_code);
            if (withCurrency) productCurrencyCode = withCurrency.currency_code;
          }
        }

        // Fetch store currency as fallback
        let storeCurrency = "SAR";
        if (!productCurrencyCode) {
          const { data: currSetting } = await supabaseAdmin
            .from("store_settings")
            .select("value")
            .eq("key", "currency")
            .maybeSingle();
          if (currSetting?.value) {
            storeCurrency = (currSetting.value as any).code || "SAR";
          }
        }

        const effectiveCurrency = productCurrencyCode || storeCurrency;
        const codCountry = CURRENCY_COUNTRY_MAP[effectiveCurrency] || codConfig.default_country || "KSA";
        const codCity = city?.trim() || codConfig.default_city || "N/A";
        const codAddress = address?.trim() || city?.trim() || "N/A";

        const leadItems = items.map((item: any) => ({
          sku: (item.product_id && skuMap[item.product_id]) || item.product_name,
          price: Number(item.total_price),
          quantity: Number(item.quantity || 1),
        }));

        if (leadItems.length === 0) {
          leadItems.push({ sku: "UNKNOWN", price: Number(total), quantity: 1 });
        }

        const leadData = {
          full_name: customer_name,
          phone: customer_phone,
          country: codCountry,
          address: codAddress,
          city: codCity,
          area: codCity,
          currency: effectiveCurrency,
          items: leadItems,
        };

        console.log("CodNetwork auto-send lead_data:", JSON.stringify(leadData));

        const res = await fetch(`${COD_NETWORK_API_BASE}/leads`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${codConfig.api_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(leadData),
        });

        const data = await res.json().catch(() => ({}));
        console.log("CodNetwork auto-send response:", res.status, JSON.stringify(data));

        if (res.ok && data) {
          const leadId = data?.data?.id || data?.id;
          const updateData: any = { cod_network_status: "sent" };
          if (leadId) updateData.cod_network_lead_id = String(leadId);
          await supabaseAdmin.from("orders").update(updateData).eq("id", orderId);
          console.log(`CodNetwork auto-send: order ${orderId} sent successfully`);
        } else {
          const errorMsg = data?.message || data?.error || "فشل غير معروف";
          await supabaseAdmin
            .from("orders")
            .update({ cod_network_status: `failed:${errorMsg}`.slice(0, 200) })
            .eq("id", orderId);
          console.error(`CodNetwork auto-send failed for ${orderId}:`, errorMsg);
        }
      }
    } catch (codErr) {
      console.error("CodNetwork auto-send error:", codErr);
      // Don't fail the order
      await supabaseAdmin
        .from("orders")
        .update({ cod_network_status: `failed:${String(codErr)}`.slice(0, 200) })
        .eq("id", orderId);
    }

    // External sync already handled above if enabled

    // WhatsApp new_order notification (fire-and-forget)
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ order_id: orderId, event: "new_order" }),
      });
    } catch (waErr) {
      console.error("WhatsApp new_order notification failed:", waErr);
    }

    console.log(`Order ${orderId} created successfully`);

    return new Response(
      JSON.stringify({ success: true, order_id: orderId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-order error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
