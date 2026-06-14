import { randomBytes } from "node:crypto";
import { normalizeEmail } from "@/lib/account";
import { db } from "@/lib/db";
import { logIntegrationEvent } from "@/lib/integration-log";
import { fulfillPaidOrder } from "@/lib/payments/fulfillment";

export class GiftCertificateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GiftCertificateError";
  }
}

export function normalizeGiftCertificateCode(code?: string | null) {
  const normalized = code?.trim().toUpperCase() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export async function generateGiftCertificateCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = `GC-${randomBytes(4).toString("hex").toUpperCase()}`;
    const existing = await db.giftCertificate.findUnique({ where: { code } });

    if (!existing) {
      return code;
    }
  }

  throw new Error("Failed to generate a unique gift certificate code");
}

export function getGiftCertificateTitle(input: {
  product?: { title: string } | null;
  tariff?: { name: string } | null;
}) {
  if (!input.product) {
    return "Курс";
  }

  return input.tariff ? `${input.product.title} - ${input.tariff.name}` : input.product.title;
}

export async function getGiftCertificateForRedemption(code: string) {
  const normalizedCode = normalizeGiftCertificateCode(code);

  if (!normalizedCode) {
    throw new GiftCertificateError("Укажите код сертификата");
  }

  const certificate = await db.giftCertificate.findUnique({
    where: { code: normalizedCode },
    include: {
      product: {
        select: {
          id: true,
          priceKgs: true,
          priceUsd: true,
          slug: true,
          title: true,
        },
      },
      tariff: {
        select: {
          id: true,
          name: true,
          priceKgs: true,
          priceUsd: true,
        },
      },
    },
  });

  if (!certificate) {
    throw new GiftCertificateError("Сертификат не найден");
  }

  if (certificate.voidedAt) {
    throw new GiftCertificateError("Сертификат аннулирован");
  }

  if (certificate.redeemedAt) {
    throw new GiftCertificateError("Сертификат уже использован");
  }

  if (!certificate.product) {
    throw new GiftCertificateError("Курс сертификата больше не доступен");
  }

  return certificate;
}

export async function redeemGiftCertificate(input: {
  code: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string | null;
}) {
  const customerEmail = normalizeEmail(input.customerEmail);
  const normalizedCode = normalizeGiftCertificateCode(input.code);

  if (!normalizedCode) {
    throw new GiftCertificateError("Укажите код сертификата");
  }

  const order = await db.$transaction(async (tx) => {
    const certificate = await tx.giftCertificate.findUnique({
      where: { code: normalizedCode },
      include: {
        product: {
          include: {
            tariffs: true,
          },
        },
        tariff: true,
      },
    });

    if (!certificate) {
      throw new GiftCertificateError("Сертификат не найден");
    }

    if (certificate.voidedAt) {
      throw new GiftCertificateError("Сертификат аннулирован");
    }

    if (certificate.redeemedAt) {
      throw new GiftCertificateError("Сертификат уже использован");
    }

    if (!certificate.product) {
      throw new GiftCertificateError("Курс сертификата больше не доступен");
    }

    const tariff = certificate.tariffId
      ? certificate.product.tariffs.find((item) => item.id === certificate.tariffId)
      : null;

    if (certificate.tariffId && !tariff) {
      throw new GiftCertificateError("Тариф сертификата больше не доступен");
    }

    const priceKgs = tariff?.priceKgs ?? certificate.product.priceKgs ?? certificate.amountKgs ?? certificate.amount;
    const priceUsd = tariff?.priceUsd ?? certificate.product.priceUsd ?? certificate.amount;
    const title = getGiftCertificateTitle({
      product: certificate.product,
      tariff,
    });
    const order = await tx.order.create({
      data: {
        amount: 0,
        currency: certificate.currency,
        customerEmail,
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone?.trim() || null,
        discountAmount: certificate.amount,
        paidAt: new Date(),
        paidCurrency: certificate.currency,
        provider: "CERTIFICATE",
        providerOrderId: `certificate:${certificate.code}`,
        purchaseType: "COURSE",
        status: "PAID",
        subtotalAmount: certificate.amount,
        syncStatus: "PENDING",
        items: {
          create: {
            priceKgs,
            priceUsd,
            productId: certificate.product.id,
            tariffId: tariff?.id ?? null,
            title,
          },
        },
      },
    });

    await tx.giftCertificate.update({
      where: { id: certificate.id },
      data: {
        redeemedAt: new Date(),
        redeemedByEmail: customerEmail,
        redeemedOrderId: order.id,
      },
    });

    await tx.integrationLog.create({
      data: {
        event: "redeemed",
        orderId: order.id,
        requestBody: JSON.stringify({
          certificateId: certificate.id,
          code: certificate.code,
          customerEmail,
        }),
        source: "gift-certificate",
        status: "SUCCESS",
      },
    });

    return order;
  });

  try {
    await fulfillPaidOrder(order.id);
  } catch (error) {
    await logIntegrationEvent({
      source: "gift-certificate",
      event: "redeem-fulfillment",
      orderId: order.id,
      status: "FAILED",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  return order;
}
