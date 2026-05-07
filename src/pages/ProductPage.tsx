import { useState, lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import StoreHeader from "@/components/StoreHeader";
import ProductDetails from "@/components/ProductDetails";
import TrackingPixels from "@/components/TrackingPixels";
import { useTrackVisit } from "@/hooks/useTrackVisit";

// Lazy-load below-the-fold sections to speed up initial page render
const ProductReviews = lazy(() => import("@/components/ProductReviews"));
const SocialProofBar = lazy(() => import("@/components/SocialProofBar"));
const StoreFooter = lazy(() => import("@/components/StoreFooter"));

const ProductPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [productId, setProductId] = useState<string>();
  useTrackVisit(`/product/${slug}`);

  return (
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      <TrackingPixels />

      {/* Announcement Bar */}
      <div className="bg-foreground text-background py-2 overflow-hidden">
        <div className="animate-marquee whitespace-nowrap flex gap-16 text-sm">
          {[...Array(4)].map((_, i) => (
            <span key={i} className="inline-flex items-center gap-2">
              <span>✦</span> توصيل مجاني في جميع أنحاء المملكة
              <span className="mx-4">✦</span> توصيل سريع لجميع المناطق
              <span className="mx-4">✦</span> الدفع عند الاستلام
            </span>
          ))}
        </div>
      </div>

      <StoreHeader />
      <main className="flex-1">
        <div className="container">
          <ProductDetails productSlug={slug} onProductLoaded={setProductId} />
          <Suspense fallback={null}>
            <SocialProofBar />
          </Suspense>
        </div>
        <Suspense fallback={<div style={{ minHeight: 400 }} />}>
          <ProductReviews productId={productId} />
        </Suspense>
      </main>
      <Suspense fallback={<div style={{ minHeight: 200 }} />}>
        <StoreFooter />
      </Suspense>
    </div>
  );
};

export default ProductPage;
