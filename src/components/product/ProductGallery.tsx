import { useState, useEffect, memo } from "react";
import { Heart, Share2 } from "lucide-react";

interface Props {
  src: string;
  alt: string;
}

function ProductGalleryImpl({ src, alt }: Props) {
  const [wish, setWish] = useState(false);

  // Inject a real <link rel="preload"> for the resolved image so the
  // browser preloader picks it up as soon as we know the URL.
  useEffect(() => {
    if (!src) return;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = src;
    (link as any).fetchPriority = "high";
    document.head.appendChild(link);
    return () => {
      try { document.head.removeChild(link); } catch {}
    };
  }, [src]);

  return (
    <div className="lg:w-1/2 lg:sticky lg:top-20 lg:self-start">
      <div className="relative rounded-md overflow-hidden bg-secondary aspect-square">
        <img
          src={src}
          alt={alt}
          width={800}
          height={800}
          sizes="(min-width: 1024px) 600px, 100vw"
          className="w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        <div className="absolute top-4 left-4 flex gap-2 z-10">
          <button
            className="w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
            aria-label="مشاركة"
            type="button"
          >
            <Share2 className="w-4 h-4 text-store-primary" />
          </button>
          <button
            onClick={() => setWish((v) => !v)}
            className="w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
            aria-label="إضافة للمفضلة"
            type="button"
          >
            <Heart className={`w-4 h-4 ${wish ? "fill-sale text-sale" : "text-store-primary"}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(ProductGalleryImpl);