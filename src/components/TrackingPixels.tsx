import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function TrackingPixels() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;

    const run = async () => {
      const { data } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "tracking")
        .maybeSingle();

      if (!data) return;
      const v = data.value as any;

      // Facebook Pixel
      if (v?.facebook_pixel_id && (v?.facebook_enabled || v?.pixel_enabled)) {
        const s = document.createElement("script");
        s.innerHTML = `
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
          (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','${v.facebook_pixel_id}');fbq('track','PageView');`;
        document.head.appendChild(s);
      }

      // Snapchat Pixel
      if (v?.snapchat_pixel_id && v?.snapchat_enabled) {
        const s = document.createElement("script");
        s.innerHTML = `
          (function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){
          a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
          a.queue=[];var s='script';var r=t.createElement(s);r.async=!0;
          r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u);})
          (window,document,'https://sc-static.net/scevent.min.js');
          snaptr('init','${v.snapchat_pixel_id}',{});snaptr('track','PAGE_VIEW');`;
        document.head.appendChild(s);
      }

      // TikTok Pixel
      if (v?.tiktok_pixel_id && v?.tiktok_enabled) {
        const s = document.createElement("script");
        s.innerHTML = `
          !function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
          ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
          ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
          for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
          ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
          ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
          ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;
          ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=document.createElement("script");
          o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;
          var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
          ttq.load('${v.tiktok_pixel_id}');ttq.page();}(window,document,'ttq');`;
        document.head.appendChild(s);
      }

      // Google Ads (gtag)
      if (v?.google_ads_id && v?.google_ads_enabled) {
        const gs = document.createElement("script");
        gs.async = true;
        gs.src = `https://www.googletagmanager.com/gtag/js?id=${v.google_ads_id}`;
        document.head.appendChild(gs);

        const s = document.createElement("script");
        s.innerHTML = `
          window.dataLayer=window.dataLayer||[];
          function gtag(){dataLayer.push(arguments);}
          gtag('js',new Date());gtag('config','${v.google_ads_id}');`;
        document.head.appendChild(s);
      }

      setInitialized(true);
    };

    // Defer until the browser is idle so pixels never block first paint / TTI.
    const w = window as any;
    const idle = w.requestIdleCallback || ((cb: any) => setTimeout(cb, 1500));
    const id = idle(run, { timeout: 3000 });
    return () => {
      const cancel = w.cancelIdleCallback || clearTimeout;
      try { cancel(id); } catch {}
    };
  }, [initialized]);

  return null;
}
