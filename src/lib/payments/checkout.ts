import { db } from "@/lib/db";
import type { CheckoutProvider } from "@/lib/payments/catalog";
import { resolveCheckoutPurchase } from "@/lib/payments/catalog";

export type ResolvedCheckoutPurchase = Awaited<ReturnType<typeof resolveCheckoutPurchase>>;

export function getCheckoutCatalogPrices(purchase: ResolvedCheckoutPurchase) {
  const priceKgs = purchase.tariff?.priceKgs ?? purchase.product.priceKgs;
  const priceUsd = purchase.tariff?.priceUsd ?? purchase.product.priceUsd;

  if (priceKgs == null || priceUsd == null) {
    throw new Error("Product must have both KGS and USD prices configured");
  }

  return {
    priceKgs,
    priceUsd,
  };
}

export async function createPendingCheckoutOrder(input: {
  purchase: ResolvedCheckoutPurchase;
  provider: CheckoutProvider;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  giftRecipientEmail?: string | null;
  userId?: string | null;
}) {
  const { priceKgs, priceUsd } = getCheckoutCatalogPrices(input.purchase);

  return db.order.create({
    data: {
      userId: input.userId ?? null,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      giftRecipientEmail:
        input.purchase.purchaseType === "GIFT_CERTIFICATE"
          ? input.giftRecipientEmail ?? input.customerEmail
          : null,
      amount: input.purchase.amount,
      currency: input.purchase.currency,
      provider: input.provider,
      purchaseType: input.purchase.purchaseType,
      status: "PENDING",
      syncStatus: "PENDING",
      items: {
        create: {
          productId: input.purchase.product.id,
          tariffId: input.purchase.tariff?.id ?? null,
          title: input.purchase.displayTitle,
          priceKgs,
          priceUsd,
        },
      },
    },
  });
}
