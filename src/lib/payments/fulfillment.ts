import { randomBytes } from "node:crypto";
import { createPasswordSetupToken, ensureCustomerAccount, normalizeEmail } from "@/lib/account";
import { db } from "@/lib/db";
import { logIntegrationEvent } from "@/lib/integration-log";
import {
  sendAccountSetupEmail,
  sendCoursePaymentConfirmationEmail,
  sendGiftCertificatePurchaserEmail,
  sendGiftCertificateRecipientEmail,
} from "@/lib/email";
import { syncCourseAccessToGetCourse } from "@/lib/getcourse";
import { getSiteUrl } from "@/lib/site-url";

async function getOrderForFulfillment(orderId: string) {
  return db.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              slug: true,
              title: true,
              getcourseGroupName: true,
            },
          },
          tariff: {
            select: {
              id: true,
              name: true,
              getcourseGroupName: true,
            },
          },
        },
      },
    },
  });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

async function generateGiftCertificateCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = `GC-${randomBytes(4).toString("hex").toUpperCase()}`;
    const existing = await db.giftCertificate.findUnique({ where: { code } });

    if (!existing) {
      return code;
    }
  }

  throw new Error("Failed to generate a unique gift certificate code");
}

async function ensureCustomerAccountForPaidOrder(orderId: string) {
  const order = await getOrderForFulfillment(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  const normalizedEmail = normalizeEmail(order.customerEmail);
  const user = await ensureCustomerAccount({
    email: normalizedEmail,
    name: order.customerName,
  });

  if (order.userId !== user.id || order.customerEmail !== normalizedEmail) {
    await db.order.update({
      where: { id: order.id },
      data: {
        customerEmail: normalizedEmail,
        userId: user.id,
      },
    });
  }

  if (user.passwordHash || order.accountSetupEmailSentAt) {
    return;
  }

  try {
    const { token } = await createPasswordSetupToken(user.id);
    const setupUrl = `${getSiteUrl()}/account/setup?token=${encodeURIComponent(token)}`;
    const result = await sendAccountSetupEmail({
      customerEmail: user.email,
      customerName: user.name,
      setupUrl,
    });

    await db.order.update({
      where: { id: order.id },
      data: {
        accountSetupEmailSentAt: new Date(),
      },
    });

    await logIntegrationEvent({
      source: "resend",
      event: "account-setup",
      orderId: order.id,
      status: "SUCCESS",
      responseBody: result,
    });
  } catch (error) {
    await logIntegrationEvent({
      source: "resend",
      event: "account-setup",
      orderId: order.id,
      status: "FAILED",
      error: getErrorMessage(error),
    });
  }
}

async function ensureGiftCertificate(orderId: string) {
  const order = await getOrderForFulfillment(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.purchaseType !== "GIFT_CERTIFICATE") {
    return null;
  }

  const existing = await db.giftCertificate.findUnique({
    where: { orderId: order.id },
  });

  if (existing) {
    return existing;
  }

  const primaryItem = order.items[0];

  if (!primaryItem) {
    throw new Error("Gift certificate order has no items");
  }

  const code = await generateGiftCertificateCode();
  const certificate = await db.giftCertificate.create({
    data: {
      code,
      orderId: order.id,
      productId: primaryItem.productId,
      tariffId: primaryItem.tariffId,
      amount: order.amount,
      currency: order.paidCurrency ?? order.currency,
      amountKgs: (order.paidCurrency ?? order.currency) === "KGS" ? order.amount : null,
      recipientEmail: order.giftRecipientEmail ?? order.customerEmail,
    },
  });

  await logIntegrationEvent({
    source: "gift-certificate",
    event: "issued",
    orderId: order.id,
    status: "SUCCESS",
    responseBody: {
      code: certificate.code,
      amount: certificate.amount,
      currency: certificate.currency,
    },
  });

  return certificate;
}

async function syncOrderToGetCourseIfNeeded(orderId: string) {
  const order = await getOrderForFulfillment(orderId);

  if (!order || order.purchaseType !== "COURSE") {
    return;
  }

  if (order.syncStatus === "SUCCESS") {
    return;
  }

  try {
    const result = await syncCourseAccessToGetCourse(order);

    await db.order.update({
      where: { id: order.id },
      data: {
        syncStatus: "SUCCESS",
        syncError: null,
        syncAttempts: { increment: 1 },
      },
    });

    await logIntegrationEvent({
      source: "getcourse",
      event: "course-access-sync",
      orderId: order.id,
      status: "SUCCESS",
      requestBody: {
        email: order.customerEmail,
      },
      responseBody: result,
    });
  } catch (error) {
    const message = getErrorMessage(error);

    await db.order.update({
      where: { id: order.id },
      data: {
        syncStatus: "FAILED",
        syncError: message,
        syncAttempts: { increment: 1 },
      },
    });

    await logIntegrationEvent({
      source: "getcourse",
      event: "course-access-sync",
      orderId: order.id,
      status: "FAILED",
      requestBody: {
        email: order.customerEmail,
      },
      error: message,
    });
  }
}

async function sendCourseEmailIfNeeded(orderId: string) {
  const order = await getOrderForFulfillment(orderId);

  if (!order || order.purchaseType !== "COURSE" || order.customerEmailSentAt) {
    return;
  }

  try {
    const result = await sendCoursePaymentConfirmationEmail({
      accountUrl: `${getSiteUrl()}/account`,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      getCourseAccessReady: order.syncStatus === "SUCCESS",
      items: order.items.map((item) => ({ title: item.title })),
    });

    await db.order.update({
      where: { id: order.id },
      data: {
        customerEmailSentAt: new Date(),
      },
    });

    await logIntegrationEvent({
      source: "resend",
      event: "course-payment-confirmation",
      orderId: order.id,
      status: "SUCCESS",
      responseBody: result,
    });
  } catch (error) {
    await logIntegrationEvent({
      source: "resend",
      event: "course-payment-confirmation",
      orderId: order.id,
      status: "FAILED",
      error: getErrorMessage(error),
    });
  }
}

async function sendGiftEmailsIfNeeded(orderId: string) {
  const order = await getOrderForFulfillment(orderId);

  if (!order || order.purchaseType !== "GIFT_CERTIFICATE") {
    return;
  }

  const certificate = await ensureGiftCertificate(orderId);
  const primaryItem = order.items[0];

  if (!certificate || !primaryItem) {
    return;
  }

  const title = primaryItem.tariff
    ? `${primaryItem.product.title} — ${primaryItem.tariff.name}`
    : primaryItem.product.title;

  if (!order.customerEmailSentAt) {
    try {
      const result = await sendGiftCertificatePurchaserEmail({
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        code: certificate.code,
        title,
        amount: certificate.amount,
        currency: certificate.currency,
      });

      await db.order.update({
        where: { id: order.id },
        data: {
          customerEmailSentAt: new Date(),
        },
      });

      await logIntegrationEvent({
        source: "resend",
        event: "gift-purchaser-confirmation",
        orderId: order.id,
        status: "SUCCESS",
        responseBody: result,
      });
    } catch (error) {
      await logIntegrationEvent({
        source: "resend",
        event: "gift-purchaser-confirmation",
        orderId: order.id,
        status: "FAILED",
        error: getErrorMessage(error),
      });
    }
  }

  const hasSeparateRecipient =
    order.giftRecipientEmail &&
    order.giftRecipientEmail.trim().length > 0 &&
    order.giftRecipientEmail.toLowerCase() !== order.customerEmail.toLowerCase();

  if (hasSeparateRecipient && !order.recipientEmailSentAt) {
    try {
      const result = await sendGiftCertificateRecipientEmail(order.giftRecipientEmail!, {
        customerName: order.customerName,
        code: certificate.code,
        title,
        amount: certificate.amount,
        currency: certificate.currency,
      });

      await db.order.update({
        where: { id: order.id },
        data: {
          recipientEmailSentAt: new Date(),
        },
      });

      await logIntegrationEvent({
        source: "resend",
        event: "gift-recipient-delivery",
        orderId: order.id,
        status: "SUCCESS",
        responseBody: result,
      });
    } catch (error) {
      await logIntegrationEvent({
        source: "resend",
        event: "gift-recipient-delivery",
        orderId: order.id,
        status: "FAILED",
        error: getErrorMessage(error),
      });
    }
  }
}

async function markGiftSyncSuccess(orderId: string) {
  await db.order.update({
    where: { id: orderId },
    data: {
      syncStatus: "SUCCESS",
      syncError: null,
    },
  });
}

export async function fulfillPaidOrder(orderId: string) {
  const order = await getOrderForFulfillment(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  await ensureCustomerAccountForPaidOrder(order.id);

  if (order.purchaseType === "GIFT_CERTIFICATE") {
    await ensureGiftCertificate(order.id);
    await markGiftSyncSuccess(order.id);
    await sendGiftEmailsIfNeeded(order.id);
    return;
  }

  await syncOrderToGetCourseIfNeeded(order.id);
  await sendCourseEmailIfNeeded(order.id);
}
