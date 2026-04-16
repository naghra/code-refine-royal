import { useState, useEffect, useCallback, useRef } from "react";

const API_URL = "https://foubanzluqitdntcnzbi.supabase.co/functions/v1/get-product-description";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdWJhbnpsdXFpdGRudGNuemJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MjczNDYsImV4cCI6MjA2MDQwMzM0Nn0.DP3VXjpMjYRheqXVnKnBKXtbSAqgMPEgrJ7YDvb3qu0";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 6000;
const DEFAULT_COUNTRY = "السعودية";

const VALID_COUNTRIES = ["السعودية", "الإمارات", "قطر"];

const countries = [
  { label: "🇸🇦 السعودية", value: "السعودية" },
  { label: "🇦🇪 الإمارات", value: "الإمارات" },
  { label: "🇶🇦 قطر", value: "قطر" },
];

function getCacheKey(handle: string, country: string) {
  return `desc_cache:${handle}:${country}`;
}

function getCached(handle: string, country: string): string | null {
  try {
    const raw = localStorage.getItem(getCacheKey(handle, country));
    if (!raw) return null;
    const { description, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) {
      localStorage.removeItem(getCacheKey(handle, country));
      return null;
    }
    return description;
  } catch {
    return null;
  }
}

function setCache(handle: string, country: string, description: string) {
  localStorage.setItem(getCacheKey(handle, country), JSON.stringify({ description, ts: Date.now() }));
}

interface Props {
  productHandle: string;
  defaultDescription?: React.ReactNode;
}

const AntibotDescription = ({ productHandle, defaultDescription }: Props) => {
  const [showCountryBar, setShowCountryBar] = useState(false);
  const [descriptionHtml, setDescriptionHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchDescription = useCallback(async (country: string) => {
    // Check cache first
    const cached = getCached(productHandle, country);
    if (cached) {
      setDescriptionHtml(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    // Abort previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Timeout
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": ANON_KEY,
          "Authorization": `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ product_handle: productHandle, country }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Non-JSON response");
      }

      const data = await res.json();
      if (res.ok && data.success && data.description) {
        setDescriptionHtml(data.description);
        setCache(productHandle, country, data.description);
      } else {
        throw new Error(data?.error || "No description");
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Error fetching description:", err);
        setError(true);
        setDescriptionHtml(null);
      }
    } finally {
      setLoading(false);
    }
  }, [productHandle]);

  // On mount: auto-select country (saved or default) — NO popup blocking
  useEffect(() => {
    const saved = localStorage.getItem("selected_country");
    const country = (saved && VALID_COUNTRIES.includes(saved)) ? saved : DEFAULT_COUNTRY;
    setSelectedCountry(country);
    localStorage.setItem("selected_country", country);
    fetchDescription(country);
  }, [fetchDescription]);

  const handleCountrySelect = useCallback((countryName: string) => {
    localStorage.setItem("selected_country", countryName);
    setSelectedCountry(countryName);
    setShowCountryBar(false);
    fetchDescription(countryName);
  }, [fetchDescription]);

  const handleRetry = useCallback(() => {
    const saved = localStorage.getItem("selected_country") || DEFAULT_COUNTRY;
    fetchDescription(saved);
  }, [fetchDescription]);

  return (
    <div id="protected-description">
      {/* Country selector - inline bar, not a blocking popup */}
      <div className="flex items-center gap-2 mb-3 flex-wrap" dir="rtl">
        {countries.map((c) => (
          <button
            key={c.value}
            onClick={() => handleCountrySelect(c.value)}
            className={`px-3 py-1.5 text-xs font-medium border rounded-full transition-all ${
              selectedCountry === c.value
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background hover:border-foreground/40"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Show default description immediately while loading */}
      {loading ? (
        <div>
          <div className="flex items-center gap-2 mb-2" dir="rtl">
            <div className="w-4 h-4 border-2 border-border border-t-foreground rounded-full animate-spin" />
            <span className="text-xs text-muted-foreground">جاري تحميل الوصف...</span>
          </div>
          {defaultDescription}
        </div>
      ) : error ? (
        <div>
          {defaultDescription}
          <div className="text-center py-3">
            <button
              onClick={handleRetry}
              className="px-4 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-secondary transition-colors"
            >
              إعادة تحميل الوصف
            </button>
          </div>
        </div>
      ) : descriptionHtml ? (
        <div
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          className="prose prose-sm max-w-none"
          dir="rtl"
        />
      ) : (
        defaultDescription || null
      )}
    </div>
  );
};

export default AntibotDescription;
