import { useState, useCallback, useEffect } from "react";
import { Heart, Share2, CheckCircle, Minus, Plus, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import LoginModal from "@/components/LoginModal";
import CheckoutModal from "@/components/CheckoutModal";

import InlineOrderForm from "@/components/InlineOrderForm";
import fallbackImage from "@/assets/product-main.jpg";
import SaveBadge from "@/components/SaveBadge";
import barcodeIcon from "@/assets/barcode-icon.png";
import { useCurrency } from "@/hooks/useCurrency";
import { getProductCurrencySymbol } from "@/lib/format-price";

const SarIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 1024 1024" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M745.4 512.5c-1.5-1.1-3-2.1-4.6-3.1 48.3-42 78.2-104.2 78.2-173.4 0-126.8-103.2-230-230-230-84.2 0-158.1 45.4-198.2 113H230c-19.9 0-36 16.1-36 36s16.1 36 36 36h124.7c-2.9 18.3-4.4 37-4.4 56 0 11.7.6 23.2 1.6 34.6-37.7 11.7-74.4 32.1-106.1 62.4-17.3 16.6-32.5 36.6-44.4 60.6-11.4 22.9-19.2 48.1-23 75.4-6.1 43.7-.7 91.2 18.8 136.5 1.4 3.2 3 6.3 4.7 9.4 31.3 57.3 88.3 96 157.5 96 24.2 0 47-5 67.5-14 2.3-1 4.6-2.1 6.8-3.2.5-.2.9-.5 1.4-.7 2.7-1.5 5.3-3 7.8-4.7 1.4-.9 2.7-1.9 4.1-2.8 1.6-1.1 3.3-2.2 4.9-3.4 6.5-4.8 12.5-10.2 18-16.1 3-3.2 5.8-6.5 8.4-10 .3-.3.5-.7.8-1 3-4 5.7-8.2 8.2-12.5.4-.7.8-1.5 1.2-2.2 36 17.2 76.2 26.8 118.7 26.8 2.7 0 5.4-.1 8.1-.2l-42.1-67.2c-64.8-3.5-121.2-38.6-153.8-89.4l19.2-12.1c3.1-2 6.1-4 9.1-6.2 2.1-1.5 4.2-3.1 6.2-4.7 2.2-1.7 4.3-3.5 6.4-5.3 4-3.5 7.8-7.2 11.4-11.1 14.2-15.4 24.6-33 31.4-51.5 15.9 4.8 32.7 7.3 50.1 7.3 41.5 0 79.7-14.5 109.7-38.7l-43.5-69.5c-17.7 14.7-40.4 23.5-65.2 23.5-24 0-46-8.3-63.4-22.1 0-.1.1-.2.1-.3 10.7-34.9 12.5-70.3 7.3-102.7h56.1c55.5 0 106-22.8 142.2-59.6l-50.2-55.3c-24.5 24.9-58.5 40.3-96.1 40.3h-74.9c-11.6-30.3-30.1-57.1-53.8-78.4h128.7c87.1 0 158 70.9 158 158s-70.9 158-158 158h-6.1zm-291.7 74.2c-2.1 1.2-4.3 2.4-6.4 3.5-24.2 12.2-44 29.7-58.2 52.1-6.4 10.2-11.5 21.2-15 33-4.5 15.3-6.5 31.7-5.3 48.7 1.2 17.3 6.2 33.9 14.1 48.4.6 1.1 1.2 2.2 1.9 3.2 16.3 26.2 44.3 44.3 77.7 44.3 11.2 0 22.2-2.5 32.4-7 1.1-.5 2.1-1 3.2-1.5-3 2.8-6.1 5.5-9.4 7.9-1.2.9-2.4 1.7-3.7 2.5-.6.4-1.2.8-1.8 1.2-1.8 1.1-3.6 2.2-5.5 3.2-1.2.6-2.4 1.2-3.7 1.8-1.7.8-3.4 1.5-5.1 2.1-13.1 5.3-27.3 8.1-42.2 8.1-47.7 0-85.9-27.6-107-66.4-.6-1.2-1.2-2.3-1.8-3.5-14.5-33.5-18.6-68.9-13.8-103.3 3-21.4 9.1-40.7 18.1-57.8 9.4-17.8 21.6-33.1 36.1-45.5 25.2-21.6 53.4-35.1 80.9-43.5-.6 10.5-1.1 20.7-1.5 30.5 5.4 12.3 12.3 24 20.5 34.8-1.1.8-2.3 1.4-3.4 2.2z" />
  </svg>
);

import applePayIcon from "@/assets/apple_pay_mini.avif";
import bankIcon from "@/assets/bank_mini.avif";
import codIcon from "@/assets/cod_mini.avif";
import sbcIcon from "@/assets/sbc.avif";
import madeInKsaIcon from "@/assets/made-in-ksa.svg";

type Product = {
  id: string;
  name_ar: string;
  description_ar: string | null;
  price: number;
  compare_at_price: number | null;
  inventory: number;
  sku: string | null;
  status: string;
  tags: string[] | null;
  currency_enabled?: boolean;
  currency_code?: string | null;
};

const ProductDetails = ({ productSlug, onProductLoaded }: { productSlug?: string; onProductLoaded?: (productId: string) => void }) => {
  const { currency } = useCurrency();
  const [quantity, setQuantity] = useState(1);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showLoginSheet, setShowLoginSheet] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [productImage, setProductImage] = useState<string>(fallbackImage);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let data: any = null;
      
      if (productSlug) {
        // Try slug first, then fall back to id (for backward compatibility)
        const { data: bySlug } = await supabase.from("products").select("*").eq("slug", productSlug).maybeSingle();
        if (bySlug) {
          data = bySlug;
        } else {
          const { data: byId } = await supabase.from("products").select("*").eq("id", productSlug).maybeSingle();
          data = byId;
        }
      } else {
        const { data: first } = await supabase.from("products").select("*").eq("status", "active").order("created_at", { ascending: true }).limit(1).maybeSingle();
        data = first;
      }

      if (data) {
        setProduct(data as Product);
        onProductLoaded?.(data.id);
        const { data: imgs } = await supabase
          .from("product_images")
          .select("url")
          .eq("product_id", data.id)
          .eq("is_main", true)
          .maybeSingle();
        if (imgs?.url) setProductImage(imgs.url);
      }
      setLoading(false);
    })();
  }, [productSlug]);

  const handleBuyNow = useCallback(() => {
    const hasProfile = localStorage.getItem("customer_first_name") && localStorage.getItem("customer_phone");
    if (hasProfile) {
      setShowCheckout(true);
      return;
    }
    setShowLoginSheet(true);
  }, []);

  const handleLoginSuccess = useCallback((email: string) => {
    setShowLoginSheet(false);
    setShowCheckout(true);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 animate-pulse">
        <div className="lg:w-1/2 h-80 bg-muted rounded-md" />
        <div className="lg:w-1/2 space-y-4">
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const currencySymbol = getProductCurrencySymbol(product, currency);
  const name = product?.name_ar || "باقة المسك";
  const price = product?.price ?? 222;
  const compareAtPrice = product?.compare_at_price ?? 1119;
  const savings = compareAtPrice > price ? compareAtPrice - price : 0;
  const skuCode = product?.sku || "7287120302040";
  const inStock = product ? product.inventory > 0 : true;



  const renderNonAntibotDescription = () => {
    const desc = product?.description_ar;
    if (!desc) {
      return (
        <>
          <p className="font-bold mb-2">مجموعة متكاملة صُممت خصيصًا لعشّاق المسك.</p>
          <p className="mb-2">تمزج بين النعومة والانتعاش والنقاء، لتمنحك إحساسًا دائمًا بالنظافة والصفاء</p>
          <p className="mb-2">تشمل عطور مسك أيقونية بأحجام كاملة، ومجموعة مني عملية، إضافة إلى زيوت مسك مركّزة لعشّاق العطور العميقة، مما يجعلها مثالية للاستخدام اليومي، للتنسيق العطري، أو كهدية أنيقة وراقية.</p>
        </>
      );
    }
    // If description contains HTML tags, render as HTML
    if (/<[a-z][\s\S]*>/i.test(desc)) {
      return (
        <div
          className="prose prose-sm max-w-none [&>p]:mb-2 [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-3 [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mb-2 [&>h3]:text-lg [&>h3]:font-bold [&>h3]:mb-2 [&>ul]:list-disc [&>ul]:pr-5 [&>ol]:list-decimal [&>ol]:pr-5 [&>ul>li]:mb-1 [&>ol>li]:mb-1 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_a]:text-primary [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: desc }}
        />
      );
    }
    // Fallback for plain text descriptions
    return desc.split("\n").map((line, i) => {
      if (!line.trim()) return null;
      if (line.startsWith("•")) {
        return <li key={i} className="mr-4">{line.replace("•", "").trim()}</li>;
      }
      return <p key={i} className={`${line.includes(":") ? "font-bold mt-3" : ""} mb-1`}>{line}</p>;
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
      {/* Product Image */}
      <div className="lg:w-1/2 lg:sticky lg:top-20 lg:self-start">
        <div className="relative rounded-md overflow-hidden bg-secondary">
          <img
            src={productImage}
            alt={name}
            className="w-full h-auto object-contain"
          />
          <div className="absolute top-4 left-4 flex gap-2 z-10">
            <button
              className="w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
              aria-label="مشاركة"
            >
              <Share2 className="w-4 h-4 text-store-primary" />
            </button>
            <button
              onClick={() => setIsWishlisted(!isWishlisted)}
              className="w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
              aria-label="إضافة للمفضلة"
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? "fill-sale text-sale" : "text-store-primary"}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Product Info */}
      <div className="lg:w-1/2">
        <h1 className="text-xl md:text-2xl font-bold text-store-primary leading-10">
          {name}
        </h1>

        {/* Price */}
        <div className="flex items-center gap-4 my-2 flex-wrap">
          <span className="font-bold text-xl text-sale flex items-center gap-1">{price} {currencySymbol}</span>
          {compareAtPrice > price && (
            <span className="text-store-secondary line-through flex items-center gap-1">{compareAtPrice.toLocaleString()} {currencySymbol}</span>
          )}
          {savings > 0 && <SaveBadge amount={savings} />}
        </div>

        <small className="text-store-secondary mb-3 block text-sm">السعر شامل الضريبة</small>

        {/* Availability */}
        <div className={`flex items-center gap-1.5 mb-5 ${inStock ? "text-green-600" : "text-red-500"}`}>
          <span className="relative flex items-center justify-center">
            {inStock && <span className="absolute w-5 h-5 rounded-full bg-green-500/40 animate-availability-ping" />}
            <CheckCircle className="w-5 h-5 relative z-10" />
          </span>
          <span className="text-sm">{inStock ? "متوفر" : "غير متوفر"}</span>
        </div>

        {/* Inline Order Form */}
        <div className="mb-5" id="order-form-section">
          <InlineOrderForm
            productName={product?.name_ar || "منتج"}
            productId={product?.id}
            productSku={product?.sku || undefined}
            unitPrice={price}
            quantity={quantity}
            currencySymbol={currencySymbol}
            snapchatConversionValue={(product as any)?.snapchat_conversion_value ?? null}
            productCurrencyCode={product?.currency_enabled ? product?.currency_code : null}
          />
        </div>

        {/* Description */}
        <div className="mb-5">
            <>
              <article
                className={`relative overflow-hidden transition-all duration-300 ${
                  showFullDescription ? "max-h-[2000px]" : "max-h-[200px]"
                }`}
              >
                {renderNonAntibotDescription()}
              </article>
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="text-primary text-sm mt-2 hover:text-accent transition-colors font-medium"
              >
                {showFullDescription ? "عرض أقل" : "قراءة المزيد"}
              </button>
            </>

        </div>

        {/* Model number */}
        <section className="bg-background p-4 rounded-md mb-5 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-store-primary text-sm flex items-center gap-1">
              <img src={barcodeIcon} alt="باركود" className="w-5 h-5" />
              <span>رقم الموديل</span>
            </span>
            <span className="text-xs text-store-secondary">{skuCode}</span>
          </div>
        </section>

        {/* Payment Methods */}
        <section className="flex items-center justify-center gap-3 mb-5">
          <img src={madeInKsaIcon} alt="صنع في السعودية" className="h-8" />
          <img src={applePayIcon} alt="Apple Pay" className="h-8" />
          <img src={bankIcon} alt="تحويل بنكي" className="h-8" />
          <img src={codIcon} alt="الدفع عند الاستلام" className="h-8" />
          <img src={sbcIcon} alt="SBC" className="h-8" />
        </section>

        <div className="h-20 lg:hidden" />
        <div className="h-4 hidden lg:block" />
      </div>

      {/* Sticky Mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden safe-area-bottom" dir="rtl">
        <div className="bg-background/95 backdrop-blur-md border-t border-border px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
          <button
            onClick={() => {
              document.getElementById("order-form-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            className="w-full h-12 rounded-xl font-bold text-base text-destructive-foreground bg-destructive hover:bg-destructive/90 shadow-lg transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-5 h-5" />
            <span>اضغط هنا للطلب</span>
          </button>
        </div>
      </div>

      <LoginModal
        open={showLoginSheet}
        onClose={() => setShowLoginSheet(false)}
        onSuccess={handleLoginSuccess}
      />

      <CheckoutModal
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
        totalAmount={price * quantity}
        productId={product?.id}
        productName={product?.name_ar || "باقة المسك"}
        quantity={quantity}
      />
    </div>
  );
};

export default ProductDetails;
