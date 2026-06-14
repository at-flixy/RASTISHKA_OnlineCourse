import { db } from "@/lib/db";
import type { resolveCheckoutPurchase } from "@/lib/payments/catalog";

export type CheckoutQuote = {
  amount: number;
  currency: string;
  discountAmount: number;
  promo: {
    code: string;
    description: string | null;
    id: string;
    percentOff: number;
  } | null;
  subtotalAmount: number;
};

type ResolvedCheckoutPurchase = Awaited<ReturnType<typeof resolveCheckoutPurchase>>;

export class PromoCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PromoCodeError";
  }
}

export function normalizePromoCode(code?: string | null) {
  const normalized = code?.trim().toUpperCase() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export function calculatePercentDiscount(subtotalAmount: number, percentOff: number) {
  if (subtotalAmount <= 0 || percentOff <= 0) {
    return 0;
  }

  return Math.min(subtotalAmount, Math.round((subtotalAmount * percentOff) / 100));
}

function assertPromoPercent(percentOff: number) {
  if (!Number.isInteger(percentOff) || percentOff < 1 || percentOff > 100) {
    throw new PromoCodeError("Промокод настроен некорректно");
  }
}

export async function quoteCheckoutPurchase(input: {
  customerEmail?: string | null;
  promoCode?: string | null;
  purchase: ResolvedCheckoutPurchase;
}): Promise<CheckoutQuote> {
  const subtotalAmount = input.purchase.amount;
  const code = normalizePromoCode(input.promoCode);

  if (!code) {
    return {
      amount: subtotalAmount,
      currency: input.purchase.currency,
      discountAmount: 0,
      promo: null,
      subtotalAmount,
    };
  }

  if (input.purchase.purchaseType !== "COURSE") {
    throw new PromoCodeError("Промокод можно применить только к покупке курса");
  }

  const promo = await db.promoCode.findUnique({
    where: { code },
    include: {
      productScopes: {
        select: {
          productId: true,
        },
      },
    },
  });

  if (!promo) {
    throw new PromoCodeError("Промокод не найден");
  }

  assertPromoPercent(promo.percentOff);

  const now = new Date();

  if (!promo.isActive) {
    throw new PromoCodeError("Промокод отключён");
  }

  if (promo.startsAt && promo.startsAt > now) {
    throw new PromoCodeError("Промокод ещё не действует");
  }

  if (promo.endsAt && promo.endsAt < now) {
    throw new PromoCodeError("Срок действия промокода истёк");
  }

  const matchesProduct =
    promo.appliesToAllProducts ||
    promo.productScopes.some((scope) => scope.productId === input.purchase.product.id);

  if (!matchesProduct) {
    throw new PromoCodeError("Промокод не действует на этот курс");
  }

  if (promo.maxRedemptions != null) {
    const redemptionCount = await db.promoRedemption.count({
      where: { promoCodeId: promo.id },
    });

    if (redemptionCount >= promo.maxRedemptions) {
      throw new PromoCodeError("Лимит использований промокода исчерпан");
    }
  }

  if (promo.perCustomerLimit != null) {
    const email = input.customerEmail?.trim().toLowerCase();

    if (!email) {
      throw new PromoCodeError("Укажите email, чтобы применить этот промокод");
    }

    const customerRedemptions = await db.promoRedemption.count({
      where: {
        customerEmail: email,
        promoCodeId: promo.id,
      },
    });

    if (customerRedemptions >= promo.perCustomerLimit) {
      throw new PromoCodeError("Этот email уже использовал промокод");
    }
  }

  const discountAmount = calculatePercentDiscount(subtotalAmount, promo.percentOff);

  return {
    amount: Math.max(0, subtotalAmount - discountAmount),
    currency: input.purchase.currency,
    discountAmount,
    promo: {
      code: promo.code,
      description: promo.description,
      id: promo.id,
      percentOff: promo.percentOff,
    },
    subtotalAmount,
  };
}

export async function recordPromoRedemptionIfNeeded(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      currency: true,
      customerEmail: true,
      discountAmount: true,
      promoCodeId: true,
    },
  });

  if (!order?.promoCodeId || order.discountAmount <= 0) {
    return null;
  }

  return db.promoRedemption.upsert({
    where: { orderId },
    create: {
      currency: order.currency,
      customerEmail: order.customerEmail,
      discountAmount: order.discountAmount,
      orderId,
      promoCodeId: order.promoCodeId,
    },
    update: {
      currency: order.currency,
      customerEmail: order.customerEmail,
      discountAmount: order.discountAmount,
      promoCodeId: order.promoCodeId,
    },
  });
}
