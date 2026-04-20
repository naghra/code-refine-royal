import { useState, useCallback, useEffect } from "react";
import { User, Phone, MapPin, Loader2, ShoppingBag, CheckCircle, Shield, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useCurrency } from "@/hooks/useCurrency";
import { motion } from "framer-motion";

const CURRENCY_COUNTRY_MAP: Record<string, string> = {
  SAR: "KSA", AED: "ARE", KWD: "KWT", BHD: "BHR", QAR: "QAT",
  OMR: "OMN", EGP: "EGY", USD: "USA", EUR: "DEU", GBP: "GBR",
  MAD: "MAR", TRY: "TUR", MRU: "MRT",
};
const currencyToCountry = (code: string) => CURRENCY_COUNTRY_MAP[code] || "";

interface OfferItem {
  id: string;
  title: string;
  quantity: number;
  price: number;
  old_price: number | null;
  label: string;
  is_best: boolean;
  product_id?: string | null;
}

interface InlineOrderFormProps {
  productName: string;
  productId?: string;
  productSku?: string;
  unitPrice: number;
  quantity: number;
  currencySymbol?: string;
  snapchatConversionValue?: number | null;
  productCurrencyCode?: string | null;
}

interface CodFormSettings {
  form_title: string;
  form_subtitle: string;
  button_text: string;
  button_color: string;
  show_city_field: boolean;
  city_field_required: boolean;
  show_urgency_text: boolean;
  urgency_text: string;
  show_trust_badges: boolean;
  trust_badge_1: string;
  trust_badge_2: string;
  trust_badge_3: string;
  success_message: string;
  name_placeholder: string;
  phone_placeholder: string;
  city_placeholder: string;
  show_offers: boolean;
  offers: OfferItem[];
}

const DEFAULT_SETTINGS: CodFormSettings = {
  form_title: "للطلب ادخل معلوماتك في الخانات اسفله",
  form_subtitle: "",
  button_text: "اضغط لتأكيد الطلب",
  button_color: "destructive",
  show_city_field: false,
  city_field_required: false,
  show_urgency_text: false,
  urgency_text: "⚡ بقيت كميات محدودة!",
  show_trust_badges: false,
  trust_badge_1: "الدفع عند الاستلام",
  trust_badge_2: "توصيل سريع",
  trust_badge_3: "ضمان الجودة",
  success_message: "تم تأكيد طلبك بنجاح!",
  name_placeholder: "ادخل اسمك هنا",
  phone_placeholder: "ادخل رقم هاتفك هنا",
  city_placeholder: "المدينة / العنوان",
  show_offers: false,
  offers: [],
};

const InlineOrderForm = ({ productName, productId, productSku, unitPrice, quantity, currencySymbol: propCurrencySymbol, snapchatConversionValue, productCurrencyCode }: InlineOrderFormProps) => {
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const displaySymbol = propCurrencySymbol || currency.symbol;
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<CodFormSettings>(DEFAULT_SETTINGS);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [sheetsWebhook, setSheetsWebhook] = useState("");
  const [codNetworkSettings, setCodNetworkSettings] = useState<{ enabled: boolean; api_token: string; default_country: string; default_city: string } | null>(null);

  // Filter offers for this product
  const filteredOffers = settings.offers?.filter(
    (o) => !o.product_id || o.product_id === productId
  ) || [];

  const selectedOffer = filteredOffers.find((o) => o.id === selectedOfferId);
  const finalQuantity = selectedOffer ? selectedOffer.quantity : quantity;
  const finalPrice = selectedOffer ? selectedOffer.price : unitPrice * quantity;

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("store_settings")
        .select("key, value")
        .in("key", ["cod_form", "integrations", "cod_network"]);
      if (data) {
        for (const row of data) {
          const v = row.value as any;
          if (row.key === "cod_form") {
            const s = { ...DEFAULT_SETTINGS, ...v };
            setSettings(s);
            const filtered = s.offers?.filter(
              (o: OfferItem) => !o.product_id || o.product_id === productId
            ) || [];
            if (s.show_offers && filtered.length > 0) {
              const best = filtered.find((o: OfferItem) => o.is_best);
              setSelectedOfferId(best?.id || filtered[0].id);
            }
          } else if (row.key === "integrations") {
            setSheetsWebhook(v.google_sheets_webhook || "");
          } else if (row.key === "cod_network") {
            if (v.enabled && v.api_token && v.auto_send) setCodNetworkSettings(v);
          }
        }
      }
    })();
  }, []);

  const normalizeDigits = (str: string) =>
    str.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
       .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 2) errs.fullName = "يرجى إدخال الاسم";
    const normalizedPhone = normalizeDigits(phone.trim().replace(/\s/g, ""));
    if (!normalizedPhone) errs.phone = "يرجى إدخال رقم الهاتف";
    else if (!/^[\+]?[0-9\-]{7,15}$/.test(normalizedPhone)) errs.phone = "رقم الهاتف غير صالح";
    if (settings.show_city_field && settings.city_field_required && !city.trim()) {
      errs.city = "يرجى إدخال المدينة";
    }
    return errs;
  }, [fullName, phone, city, settings]);

  const handleSubmit = useCallback(async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (submitting) return;
    setSubmitting(true);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("create-order", {
        body: {
          customer_name: fullName.trim(),
          customer_phone: normalizeDigits(phone.trim().replace(/\s/g, "")),
          city: city.trim() || null,
          address: city.trim() || null,
          payment_method: "cod",
          shipping_method: "standard",
          subtotal: finalPrice,
          shipping_cost: 0,
          total: finalPrice,
          items: [{
            product_id: productId || null,
            product_name: productName,
            quantity: finalQuantity,
            unit_price: unitPrice,
            total_price: finalPrice,
          }],
        },
      });

      if (invokeError) throw invokeError;
      if (!data?.success) throw new Error(data?.error || "Order creation failed");

      const orderId = data.order_id;
      const requiresConfirmation = !!data.requires_confirmation;

      // Fire-and-forget: geolocate IP for this order
      supabase.functions.invoke("geolocate-ip", {
        body: { order_id: orderId },
      }).catch(() => {});

      // Fire-and-forget: send to Google Sheets
      if (sheetsWebhook) {
        const now = new Date();
        const riyadhDate = now.toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });
        const riyadhTime = now.toLocaleTimeString("en-GB", { timeZone: "Asia/Riyadh", hour: "2-digit", minute: "2-digit", hour12: false });
        const offerText = selectedOffer ? `${selectedOffer.quantity} ب ${selectedOffer.price}` : "";
        fetch(sheetsWebhook, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({
            name: fullName.trim(),
            phone: phone.trim(),
            city: city.trim() || "غير محدد",
            product: productName,
            sku: productSku || "",
            quantity: finalQuantity,
            offer: offerText,
            price: Number(finalPrice),
            date: riyadhDate,
            time: riyadhTime,
            status: "جديد",
          }),
        }).catch(() => {});
      }

      // Fire-and-forget: send to CodNetwork
      if (codNetworkSettings) {
        const codCity = city.trim() || codNetworkSettings.default_city || "N/A";
        const codAddress = city.trim() || "N/A";
        const effectiveCurrencyCode = productCurrencyCode || currency.code;
        const codCountry = currencyToCountry(effectiveCurrencyCode) || codNetworkSettings.default_country || "KSA";
        supabase.functions.invoke("cod-network-proxy", {
          body: {
            action: "send_order",
            api_token: codNetworkSettings.api_token,
            order_data: {
              full_name: fullName.trim(),
              phone: phone.trim(),
              country: codCountry,
              address: codAddress,
              city: codCity,
              area: codCity,
              currency: effectiveCurrencyCode,
              items: [{
                sku: productSku || "DEFAULT",
                price: Number(finalPrice),
                quantity: Number(finalQuantity),
              }],
            },
          },
        }).catch((err) => console.error("CodNetwork send failed:", err));
      }

      const snapValue = snapchatConversionValue != null ? snapchatConversionValue * finalQuantity : null;
      const snapParam = snapValue != null ? `&snap_value=${snapValue}` : "";

      // Check if any product in order has gift enabled
      let hasGift = false;
      let productImage: string | null = null;
      if (productId) {
        const { data: prod } = await supabase
          .from("products")
          .select("has_gift")
          .eq("id", productId)
          .maybeSingle();
        if ((prod as any)?.has_gift) hasGift = true;
        const { data: img } = await supabase
          .from("product_images")
          .select("url")
          .eq("product_id", productId)
          .order("is_main", { ascending: false })
          .order("sort_order", { ascending: true })
          .limit(1)
          .maybeSingle();
        productImage = (img as any)?.url ?? null;
      }

      if (requiresConfirmation) {
        const pending = {
          order_id: orderId,
          customer_name: fullName.trim(),
          customer_phone: normalizeDigits(phone.trim().replace(/\s/g, "")),
          product_id: productId || null,
          product_name: productName,
          product_image: productImage,
          quantity: finalQuantity,
          unit_price: unitPrice,
          total: finalPrice,
          has_gift: hasGift,
          created_at: Date.now(),
        };
        sessionStorage.setItem("pending_order", JSON.stringify(pending));
        navigate("/confirm");
        return;
      }

      if (hasGift) {
        navigate(`/gift?order_id=${encodeURIComponent(orderId)}&product_id=${encodeURIComponent(productId || "")}`);
      } else {
        navigate(`/thank-you?order=${encodeURIComponent(orderId)}&total=${finalPrice}${snapParam}`);
      }
    } catch (err) {
      console.error("Order creation failed:", err);
      setErrors({ fullName: "حدث خطأ، حاول مرة أخرى" });
    } finally {
      setSubmitting(false);
    }
  }, [validate, submitting, fullName, phone, city, finalPrice, navigate]);

  const btnColorClass =
    settings.button_color === "primary"
      ? "bg-primary text-primary-foreground hover:bg-primary/90"
      : settings.button_color === "green"
      ? "bg-emerald-600 text-white hover:bg-emerald-700"
      : "bg-destructive text-destructive-foreground hover:bg-destructive/90";

  return (
    <div className="w-full animate-fade-in" dir="rtl">
      <div className="border-2 border-destructive rounded-2xl overflow-hidden bg-card">
        {/* Header */}
        <div className="px-5 py-4 text-center">
          <h3 className="text-lg md:text-xl font-bold text-foreground leading-relaxed">
            {settings.form_title}
          </h3>
          {settings.form_subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{settings.form_subtitle}</p>
          )}
        </div>

        {/* Form */}
        <div className="px-5 pb-5 space-y-4">
          {/* Offers */}
          {settings.show_offers && filteredOffers.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-sm font-bold text-foreground text-center">🔥 اختر العرض المناسب</p>
              {filteredOffers.map((offer) => {
                const isSelected = selectedOfferId === offer.id;
                const discount = offer.old_price && offer.old_price > offer.price
                  ? Math.round(((offer.old_price - offer.price) / offer.old_price) * 100)
                  : null;

                return (
                  <motion.button
                    key={offer.id}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedOfferId(offer.id)}
                    className={`w-full relative rounded-xl border-2 p-3.5 text-right transition-all duration-200 ${
                      isSelected
                        ? "border-destructive bg-destructive/5 shadow-lg shadow-destructive/10"
                        : "border-border hover:border-destructive/30"
                    }`}
                  >
                    {/* Badge */}
                    {offer.label && (
                      <span className={`absolute -top-2.5 right-3 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        offer.is_best
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {offer.label}
                      </span>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {/* Radio circle */}
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? "border-destructive" : "border-muted-foreground/30"
                        }`}>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-2.5 h-2.5 rounded-full bg-destructive"
                            />
                          )}
                        </div>
                        <span className="text-sm font-bold text-foreground">{offer.title || `${offer.quantity} قطعة`}</span>
                      </div>

                      <div className="flex items-baseline gap-2">
                        {offer.old_price && offer.old_price > offer.price && (
                          <span className="text-xs text-muted-foreground line-through">{offer.old_price} {displaySymbol}</span>
                        )}
                        <span className={`text-base font-black ${isSelected ? "text-destructive" : "text-foreground"}`}>
                          {offer.price} {displaySymbol}
                        </span>
                        {discount && (
                          <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full font-bold">
                            وفّر {discount}%
                          </span>
                        )}
                      </div>
                    </div>

                    {offer.is_best && isSelected && (
                      <div className="mt-1.5 text-[11px] text-primary font-medium text-center">
                        🔥 العرض الأكثر اختياراً
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground text-right block">الاسم<span className="text-destructive">*</span></label>
            <div className="relative">
              <div className="absolute right-0 top-0 h-12 w-12 rounded-r-xl bg-muted flex items-center justify-center border border-input border-r-0">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
              <input
                type="text"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setErrors((er) => ({ ...er, fullName: "" })); }}
                placeholder={settings.name_placeholder}
                className="w-full h-12 rounded-xl border border-input bg-background pr-14 pl-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all"
                style={{ fontSize: "16px" }}
              />
            </div>
            {errors.fullName && <p className="text-destructive text-xs font-medium animate-fade-in">{errors.fullName}</p>}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground text-right block">رقم الهاتف<span className="text-destructive">*</span></label>
            <div className="relative">
              <div className="absolute right-0 top-0 h-12 w-12 rounded-r-xl bg-muted flex items-center justify-center border border-input border-r-0">
                <Phone className="w-5 h-5 text-muted-foreground" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setErrors((er) => ({ ...er, phone: "" })); }}
                placeholder={settings.phone_placeholder}
                dir="ltr"
                className="w-full h-12 rounded-xl border border-input bg-background pr-14 pl-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all text-right"
                style={{ fontSize: "16px" }}
              />
            </div>
            {errors.phone && <p className="text-destructive text-xs font-medium animate-fade-in">{errors.phone}</p>}
          </div>

          {/* City */}
          {settings.show_city_field && (
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground text-right block">
                المدينة / العنوان
                {settings.city_field_required && <span className="text-destructive">*</span>}
              </label>
              <div className="relative">
                <div className="absolute right-0 top-0 h-12 w-12 rounded-r-xl bg-muted flex items-center justify-center border border-input border-r-0">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => { setCity(e.target.value); setErrors((er) => ({ ...er, city: "" })); }}
                  placeholder={settings.city_placeholder}
                  className="w-full h-12 rounded-xl border border-input bg-background pr-14 pl-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all"
                  style={{ fontSize: "16px" }}
                />
              </div>
              {errors.city && <p className="text-destructive text-xs font-medium animate-fade-in">{errors.city}</p>}
            </div>
          )}

          {/* Urgency text */}
          {settings.show_urgency_text && (
            <p className="text-center text-sm font-bold text-destructive animate-pulse">{settings.urgency_text}</p>
          )}

          {/* CTA Button */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`w-full h-14 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-all duration-300 active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100 flex items-center justify-center gap-2.5 animate-[pulse-scale_1.5s_ease-in-out_infinite] ${btnColorClass}`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جارٍ إرسال الطلب...</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-5 h-5" />
                <span>{settings.button_text}</span>
              </>
            )}
          </button>

          {/* Trust Badges */}
          {settings.show_trust_badges && (
            <div className="flex justify-center gap-4 pt-1">
              {[settings.trust_badge_1, settings.trust_badge_2, settings.trust_badge_3].filter(Boolean).map((badge, i) => (
                <span key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InlineOrderForm;
