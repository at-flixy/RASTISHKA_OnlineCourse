"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    ym?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

interface RouteTrackerProps {
  yandexMetricaId: string | null;
  hasGa: boolean;
  hasPixel: boolean;
}

export function RouteTracker({ yandexMetricaId, hasGa, hasPixel }: RouteTrackerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstFire = useRef(true);

  useEffect(() => {
    if (isFirstFire.current) {
      isFirstFire.current = false;
      return;
    }

    const search = searchParams?.toString();
    const url = pathname + (search ? `?${search}` : "");
    const fullUrl = typeof window !== "undefined" ? window.location.origin + url : url;

    if (hasGa && typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_path: url,
        page_location: fullUrl,
      });
    }

    if (yandexMetricaId && typeof window.ym === "function") {
      window.ym(Number(yandexMetricaId), "hit", fullUrl);
    }

    if (hasPixel && typeof window.fbq === "function") {
      window.fbq("track", "PageView");
    }
  }, [pathname, searchParams, yandexMetricaId, hasGa, hasPixel]);

  return null;
}
