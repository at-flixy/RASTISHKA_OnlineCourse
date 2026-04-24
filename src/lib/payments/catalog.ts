import { z } from "zod";
import { db } from "@/lib/db";

export const currencySchema = z.enum(["KGS", "USD"]);
export const purchaseTypeSchema = z.enum(["COURSE", "GIFT_CERTIFICATE"]);
export const providerSchema = z.enum(["FREEDOMPAY", "STRIPE"]);

export type CheckoutCurrency = z.infer<typeof currencySchema>;
export type PurchaseType = z.infer<typeof purchaseTypeSchema>;
export type CheckoutProvider = z.infer<typeof providerSchema>;

export function normalizePurchaseType(value?: string | null): PurchaseType {
  if (!value) {
    return "COURSE";
  }

  return value === "gift" || value === "GIFT_CERTIFICATE" ? "GIFT_CERTIFICATE" : "COURSE";
}

export function normalizeCheckoutProvider(
  value?: string | null,
  availableProviders?: CheckoutProvider[]
): CheckoutProvider {
  const requestedProvider = value === "STRIPE" ? "STRIPE" : "FREEDOMPAY";

  if (availableProviders?.length) {
    return availableProviders.includes(requestedProvider) ? requestedProvider : availableProviders[0];
  }

  return requestedProvider;
}

export const createCheckoutSessionSchema = z.object({
  productSlug: z.string().min(1),
  tariffId: z.string().min(1).optional().nullable(),
  purchaseType: purchaseTypeSchema.default("COURSE"),
  currency: currencySchema.default("KGS"),
  provider: providerSchema.default("FREEDOMPAY"),
  customerName: z.string().min(2).max(120),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(5).max(40),
  giftRecipientEmail: z.string().email().optional().nullable(),
});

export async function getCheckoutProduct(productSlug: string) {
  const product = await db.product.findFirst({
    where: {
      slug: productSlug,
      isPublished: true,
    },
    include: {
      tariffs: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!product) {
    throw new Error("Published product not found");
  }

  return product;
}

export function getAvailableCurrencies(input: {
  priceKgs: number | null;
  priceUsd: number | null;
}) {
  const currencies: CheckoutCurrency[] = [];

  if (input.priceKgs != null) {
    currencies.push("KGS");
  }

  if (input.priceUsd != null) {
    currencies.push("USD");
  }

  return currencies;
}

export function getDefaultTariffId(
  tariffs: Array<{
    id: string;
  }>,
  requestedTariffId?: string | null
) {
  if (requestedTariffId && tariffs.some((tariff) => tariff.id === requestedTariffId)) {
    return requestedTariffId;
  }

  return tariffs[0]?.id ?? null;
}

export function getDefaultCurrency(input: {
  priceKgs: number | null;
  priceUsd: number | null;
  requestedCurrency?: string | null;
}) {
  const parsed = input.requestedCurrency
    ? currencySchema.safeParse(input.requestedCurrency.toUpperCase())
    : null;

  if (parsed?.success) {
    const amount = parsed.data === "KGS" ? input.priceKgs : input.priceUsd;
    if (amount != null) {
      return parsed.data;
    }
  }

  if (input.priceKgs != null) {
    return "KGS" as const;
  }

  if (input.priceUsd != null) {
    return "USD" as const;
  }

  throw new Error("No supported price configured for this product");
}

export async function resolveCheckoutPurchase(input: {
  productSlug: string;
  tariffId?: string | null;
  currency: CheckoutCurrency;
  purchaseType: PurchaseType;
}) {
  const product = await getCheckoutProduct(input.productSlug);
  const tariff =
    product.tariffs.find((item) => item.id === getDefaultTariffId(product.tariffs, input.tariffId)) ??
    null;

  if (input.tariffId && !tariff) {
    throw new Error("Tariff not found");
  }

  const priceSource = tariff ?? product;
  const amount = input.currency === "KGS" ? priceSource.priceKgs : priceSource.priceUsd;

  if (amount == null) {
    throw new Error(`Price in ${input.currency} is not configured`);
  }

  const baseTitle = tariff ? `${product.title} — ${tariff.name}` : product.title;
  const displayTitle =
    input.purchaseType === "GIFT_CERTIFICATE" ? `Подарочный сертификат: ${baseTitle}` : baseTitle;

  return {
    product,
    tariff,
    amount,
    currency: input.currency,
    purchaseType: input.purchaseType,
    displayTitle,
    description:
      input.purchaseType === "GIFT_CERTIFICATE"
        ? `Подарочный сертификат на ${baseTitle}`
        : product.shortDescription,
  };
}
