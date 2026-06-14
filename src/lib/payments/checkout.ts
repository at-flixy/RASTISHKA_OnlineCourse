import { db } from "@/lib/db";
import type { CheckoutProvider } from "@/lib/payments/catalog";
import { resolveCheckoutPurchase } from "@/lib/payments/catalog";
import type { CheckoutQuote } from "@/lib/payments/pricing";

export type ResolvedCheckoutPurchase = Awaited<ReturnType<typeof resolveCheckoutPurchase>>;
export type CheckoutOrderProvider = CheckoutProvider | "MANUAL" | "CERTIFICATE";

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
  provider: CheckoutOrderProvider;
  quote?: CheckoutQuote;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  giftRecipientEmail?: string | null;
  userId?: string | null;
}) {
  const { priceKgs, priceUsd } = getCheckoutCatalogPrices(input.purchase);
  const quote =
    input.quote ?? {
      amount: input.purchase.amount,
      currency: input.purchase.currency,
      discountAmount: 0,
      promo: null,
      subtotalAmount: input.purchase.amount,
    };

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
      subtotalAmount: quote.subtotalAmount,
      discountAmount: quote.discountAmount,
      amount: quote.amount,
      currency: quote.currency,
      provider: input.provider,
      purchaseType: input.purchase.purchaseType,
      promoCodeId: quote.promo?.id ?? null,
      promoCodeValue: quote.promo?.code ?? null,
      promoPercentOff: quote.promo?.percentOff ?? null,
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
