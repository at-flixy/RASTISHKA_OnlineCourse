"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    ym?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

interface PurchaseItem {
  id: string;
  name: string;
  price: number;
}

interface PurchaseTrackerProps {
  orderId: string;
  amountMinor: number;
  currency: string;
  items: PurchaseItem[];
  yandexMetricaId: string | null;
}

export function PurchaseTracker({
  orderId,
  amountMinor,
  currency,
  items,
  yandexMetricaId,
}: PurchaseTrackerProps) {
  useEffect(() => {
    const storageKey = `purchase-fired-${orderId}`;
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(storageKey)) return;

    const value = amountMinor / 100;
    const itemIds = items.map((i) => i.id);

    if (typeof window.gtag === "function") {
      window.gtag("event", "purchase", {
        transaction_id: orderId,
        value,
        currency,
        items: items.map((item) => ({
          item_id: item.id,
          item_name: item.name,
          price: item.price / 100,
          quantity: 1,
        })),
      });
    }

    if (typeof window.fbq === "function") {
      window.fbq("track", "Purchase", {
        value,
        currency,
        content_ids: itemIds,
        content_type: "product",
      });
    }

    if (yandexMetricaId && typeof window.ym === "function") {
      window.ym(Number(yandexMetricaId), "reachGoal", "purchase", {
        order_id: orderId,
        order_price: value,
        currency,
      });
    }

    window.sessionStorage.setItem(storageKey, "1");
  }, [orderId, amountMinor, currency, items, yandexMetricaId]);

  return null;
}
