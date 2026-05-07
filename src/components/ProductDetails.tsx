import { useState, useEffect, lazy, Suspense } from "react";
import { CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import fallbackImage from "@/assets/product-main.jpg";
import SaveBadge from "@/components/SaveBadge";
import { useCurrency } from "@/hooks/useCurrency";
import { getProductCurrencySymbol } from "@/lib/format-price";
import ProductGallery from "@/components/product/ProductGallery";
import StickyMobileBuyBar from "@/components/product/StickyMobileBuyBar";
import LazyVisible from "@/components/LazyVisible";

const InlineOrderForm = lazy(() => import("@/components/InlineOrderForm"));
const AntibotDescription = lazy(() => import("@/components/AntibotDescription"));
const ProductPaymentMethods = lazy(() => import("@/components/product/ProductPaymentMethods"));
const ProductModelNumber = lazy(() => import("@/components/product/ProductModelNumber"));

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

const ProductDetails = ({
  productSlug,
  onProductLoaded,
}: {
  productSlug?: string;
  onProductLoaded?: (productId: string) => void;
}) => {
  const { currency } = useCurrency();
  const [quantity] = useState(1);
  const [showFullDescription] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [productImage, setProductImage] = useState<string>(fallbackImage);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let data: any = null;

      if (productSlug) {
        const { data: bySlug } = await supabase
          .from("products")
          .select("*, product_images(url, is_main, sort_order)")
          .eq("slug", productSlug)
          .maybeSingle();
        if (bySlug) {
          data = bySlug;
        } else {
          const { data: byId } = await supabase
            .from("products")
            .select("*, product_images(url, is_main, sort_order)")
            .eq("id", productSlug)
            .maybeSingle();
          data = byId;
        }
      } else {
        const { data: first } = await supabase
          .from("products")
          .select("*, product_images(url, is_main, sort_order)")
          .eq("status", "active")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        data = first;
      }

      if (data) {
        setProduct(data as Product);
        onProductLoaded?.(data.id);
        const imgs =
          (data.product_images as Array<{ url: string; is_main: boolean; sort_order: number }> | undefined) || [];
        if (imgs.length) {
          const main = imgs.find((i) => i.is_main) || imgs.sort((a, b) => a.sort_order - b.sort_order)[0];
          if (main?.url) setProductImage(main.url);
        }
      }
      setLoading(false);
    })();
  }, [productSlug]);

  if (loading) {
    return (
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 animate-pulse">
        <div className="lg:w-1/2 aspect-square bg-muted rounded-md" />
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
  const isAntibot = product?.tags?.includes("antibot") ?? false;

  const renderNonAntibotDescription = () => {
    const desc = product?.description_ar;
    if (!desc) {
      return (
        <>
          <p className="font-bold mb-2">مجموعة متكاملة صُممت خصيصًا لعشّاق المسك.</p>
          <p className="mb-2">تمزج بين النعومة والانتعاش والنقاء، لتمنحك إحساسًا دائمًا بالنظافة والصفاء</p>
          <p className="mb-2">
            تشمل عطور مسك أيقونية بأحجام كاملة، ومجموعة مني عملية، إضافة إلى زيوت مسك مركّزة لعشّاق العطور العميقة، مما يجعلها مثالية للاستخدام اليومي، للتنسيق العطري، أو كهدية أنيقة وراقية.
          </p>
        </>
      );
    }
    if (/<[a-z][\s\S]*>/i.test(desc)) {
      return (
        <div
          className="prose prose-sm max-w-none [&>p]:mb-2 [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-3 [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mb-2 [&>h3]:text-lg [&>h3]:font-bold [&>h3]:mb-2 [&>ul]:list-disc [&>ul]:pr-5 [&>ol]:list-decimal [&>ol]:pr-5 [&>ul>li]:mb-1 [&>ol>li]:mb-1 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_a]:text-primary [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: desc }}
        />
      );
    }
    return desc.split("\n").map((line, i) => {
      if (!line.trim()) return null;
      if (line.startsWith("•")) {
        return (
          <li key={i} className="mr-4">
            {line.replace("•", "").trim()}
          </li>
        );
      }
      return (
        <p key={i} className={`${line.includes(":") ? "font-bold mt-3" : ""} mb-1`}>
          {line}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
      <ProductGallery src={productImage} alt={name} />

      <div className="lg:w-1/2">
        <h1 className="text-xl md:text-2xl font-bold text-store-primary leading-10">{name}</h1>

        <div className="flex items-center gap-4 my-2 flex-wrap">
          <span className="font-bold text-xl text-sale flex items-center gap-1">
            {price} {currencySymbol}
          </span>
          {compareAtPrice > price && (
            <span className="text-store-secondary line-through flex items-center gap-1">
              {compareAtPrice.toLocaleString()} {currencySymbol}
            </span>
          )}
          {savings > 0 && <SaveBadge amount={savings} />}
        </div>

        <small className="text-store-secondary mb-3 block text-sm">السعر شامل الضريبة</small>

        <div className={`flex items-center gap-1.5 mb-5 ${inStock ? "text-green-600" : "text-red-500"}`}>
          <span className="relative flex items-center justify-center">
            {inStock && <span className="absolute w-5 h-5 rounded-full bg-green-500/40 animate-availability-ping" />}
            <CheckCircle className="w-5 h-5 relative z-10" />
          </span>
          <span className="text-sm">{inStock ? "متوفر" : "غير متوفر"}</span>
        </div>

        <div className="mb-5" id="order-form-section">
          <Suspense fallback={<div style={{ minHeight: 320 }} />}>
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
          </Suspense>
        </div>

        <LazyVisible minHeight={220}>
          <div className="mb-5">
            {isAntibot ? (
              <Suspense fallback={<div style={{ minHeight: 200 }} />}>
                <AntibotDescription
                  productHandle={product?.tags?.find((t) => t !== "antibot") || product?.id || ""}
                  defaultDescription={
                    <article
                      className={`relative overflow-hidden transition-all duration-300 ${
                        showFullDescription ? "max-h-[2000px]" : "max-h-[200px]"
                      }`}
                    >
                      {renderNonAntibotDescription()}
                    </article>
                  }
                />
              </Suspense>
            ) : (
              <article>{renderNonAntibotDescription()}</article>
            )}
          </div>
        </LazyVisible>

        <LazyVisible minHeight={70}>
          <Suspense fallback={null}>
            <ProductModelNumber skuCode={skuCode} />
          </Suspense>
        </LazyVisible>

        <LazyVisible minHeight={50}>
          <Suspense fallback={null}>
            <ProductPaymentMethods />
          </Suspense>
        </LazyVisible>

        <div className="h-20 lg:hidden" />
        <div className="h-4 hidden lg:block" />
      </div>

      <StickyMobileBuyBar />
    </div>
  );
};

export default ProductDetails;
