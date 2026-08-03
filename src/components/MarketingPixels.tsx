import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getPublicPixels } from "@/lib/admin-settings.functions";

const PIXEL_ID_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

function safePixelId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return PIXEL_ID_PATTERN.test(trimmed) ? trimmed : null;
}

function loadExternalScript(id: string, src: string) {
  if (typeof document === "undefined" || document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.src = src;
  script.async = true;
  script.referrerPolicy = "strict-origin-when-cross-origin";
  document.head.appendChild(script);
}

function loadInlineScript(id: string, code: string) {
  if (typeof document === "undefined" || document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  // textContent avoids HTML parsing. Pixel identifiers are also validated above.
  script.textContent = code;
  document.head.appendChild(script);
}

export function MarketingPixels() {
  const fn = useServerFn(getPublicPixels);
  const { data } = useQuery({
    queryKey: ["public-pixels"],
    queryFn: () => fn(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!data) return;

    const metaId = safePixelId(data.pixel_meta_id);
    const tiktokId = safePixelId(data.pixel_tiktok_id);
    const snapchatId = safePixelId(data.pixel_snapchat_id);
    const gaId = safePixelId(data.pixel_google_analytics_id);
    const googleAdsId = safePixelId(data.pixel_google_ads_id);
    const twitterId = safePixelId(data.pixel_twitter_id);
    const linkedinId = safePixelId(data.pixel_linkedin_id);
    const pinterestId = safePixelId(data.pixel_pinterest_id);

    if (metaId) {
      loadInlineScript("meta-pixel", `
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init','${metaId}'); fbq('track','PageView');
      `);
    }

    if (tiktokId) {
      loadInlineScript("tiktok-pixel", `
        !function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var i=document.createElement("script");i.type="text/javascript",i.async=!0,i.src=r+"?sdkid="+encodeURIComponent(e)+"&lib="+encodeURIComponent(t);var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(i,a)};
        ttq.load('${tiktokId}'); ttq.page();}(window, document, 'ttq');
      `);
    }

    if (snapchatId) {
      loadInlineScript("snap-pixel", `
        (function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s='script',r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');
        snaptr('init','${snapchatId}'); snaptr('track','PAGE_VIEW');
      `);
    }

    if (gaId) {
      loadExternalScript("ga4-loader", `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`);
      loadInlineScript("ga4-init", `
        window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}
        gtag('js', new Date()); gtag('config','${gaId}');
        ${googleAdsId ? `gtag('config','${googleAdsId}');` : ""}
      `);
    }

    if (twitterId) {
      loadInlineScript("twitter-pixel", `
        !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments)},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
        twq('config','${twitterId}');
      `);
    }

    if (linkedinId) {
      loadInlineScript("linkedin-pixel", `
        _linkedin_partner_id='${linkedinId}';window._linkedin_data_partner_ids=window._linkedin_data_partner_ids||[];window._linkedin_data_partner_ids.push(_linkedin_partner_id);
        (function(l){if(!l){window.lintrk=function(a,b){window.lintrk.q.push([a,b])};window.lintrk.q=[]}var s=document.getElementsByTagName('script')[0];var b=document.createElement('script');b.type='text/javascript';b.async=true;b.src='https://snap.licdn.com/li.lms-analytics/insight.min.js';s.parentNode.insertBefore(b,s);})(window.lintrk);
      `);
    }

    if (pinterestId) {
      loadInlineScript("pinterest-pixel", `
        !function(e){if(!window.pintrk){window.pintrk=function(){window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var n=window.pintrk;n.queue=[],n.version='3.0';var t=document.createElement('script');t.async=!0,t.src=e;var r=document.getElementsByTagName('script')[0];r.parentNode.insertBefore(t,r)}}('https://s.pinimg.com/ct/core.js');
        pintrk('load','${pinterestId}'); pintrk('page');
      `);
    }
  }, [data]);

  return null;
}
