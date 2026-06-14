import Script from "next/script";
import { connection } from "next/server";
import { Suspense } from "react";
import { getSiteSettings } from "@/lib/site-settings";
import { RouteTracker } from "@/components/RouteTracker";

export async function Analytics() {
  await connection();
  const settings = await getSiteSettings();
  if (!settings) return null;

  const hasYandex = Boolean(settings.yandexMetricaId);
  const hasGa = Boolean(settings.gaId);
  const hasPixel = Boolean(settings.metaPixelId);

  if (!hasYandex && !hasGa && !hasPixel) return null;

  return (
    <>
      {/* Яндекс.Метрика */}
      {hasYandex && (
        <Script
          id="yandex-metrica"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
              m[i].l=1*new Date();
              for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
              k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
              (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
              ym(${settings.yandexMetricaId}, "init", {
                clickmap:true,
                trackLinks:true,
                accurateTrackBounce:true,
                webvisor:true
              });
            `,
          }}
        />
      )}

      {/* Google Analytics 4 */}
      {hasGa && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${settings.gaId}`}
            strategy="afterInteractive"
          />
          <Script
            id="google-analytics"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${settings.gaId}');
              `,
            }}
          />
        </>
      )}

      {/* Meta Pixel */}
      {hasPixel && (
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
              n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
              document,'script','https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${settings.metaPixelId}');
              fbq('track', 'PageView');
            `,
          }}
        />
      )}

      <Suspense fallback={null}>
        <RouteTracker
          yandexMetricaId={settings.yandexMetricaId}
          hasGa={hasGa}
          hasPixel={hasPixel}
        />
      </Suspense>
    </>
  );
}
