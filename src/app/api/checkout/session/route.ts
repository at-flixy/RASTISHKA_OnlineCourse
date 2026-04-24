import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logIntegrationEvent } from "@/lib/integration-log";
import {
  createCheckoutSessionSchema,
  resolveCheckoutPurchase,
} from "@/lib/payments/catalog";
import { createPendingCheckoutOrder } from "@/lib/payments/checkout";
import {
  createFreedomPayPayment,
  getFreedomPayErrorMessage,
} from "@/lib/payments/freedompay";
import {
  getStripe,
  getStripePaymentIntentId,
  getStripePublishableKey,
} from "@/lib/payments/stripe";
import { isCheckoutProviderAvailable } from "@/lib/payments/provider-meta";
import { getSiteUrl } from "@/lib/site-url";

export const runtime = "nodejs";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

async function createStripeCheckoutSession(input: {
  customerEmail: string;
  giftRecipientEmail?: string | null;
  order: Awaited<ReturnType<typeof createPendingCheckoutOrder>>;
  purchase: Awaited<ReturnType<typeof resolveCheckoutPurchase>>;
  purchaseType: "COURSE" | "GIFT_CERTIFICATE";
}) {
  const stripe = getStripe();
  const siteUrl = getSiteUrl();
  const metadata = {
    currency: input.purchase.currency,
    customerEmail: input.customerEmail,
    giftRecipientEmail: input.giftRecipientEmail ?? "",
    orderId: input.order.id,
    productId: input.purchase.product.id,
    purchaseType: input.purchaseType,
    tariffId: input.purchase.tariff?.id ?? "",
  };
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${siteUrl}/checkout/success?order=${input.order.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/checkout/cancel?order=${input.order.id}`,
    client_reference_id: input.order.id,
    customer_email: input.order.customerEmail,
    locale: "auto",
    metadata,
    payment_intent_data: {
      metadata,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: input.purchase.currency.toLowerCase(),
          unit_amount: input.purchase.amount,
          product_data: {
            name: input.purchase.displayTitle,
            description: input.purchase.description,
          },
        },
      },
    ],
  });

  if (!session.url) {
    throw new Error("Stripe session URL is missing");
  }

  const paymentIntentId = getStripePaymentIntentId(session.payment_intent);

  await db.order.update({
    where: { id: input.order.id },
    data: {
      providerOrderId: session.id,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
    },
  });

  await logIntegrationEvent({
    source: "stripe",
    event: "checkout-session-create",
    orderId: input.order.id,
    status: "SUCCESS",
    requestBody: metadata,
    responseBody: {
      amount: input.purchase.amount,
      currency: input.purchase.currency,
      paymentIntentId,
      sessionId: session.id,
    },
  });

  return {
    orderId: input.order.id,
    publishableKey: getStripePublishableKey(),
    url: session.url,
  };
}

async function createFreedomPayCheckoutSession(input: {
  order: Awaited<ReturnType<typeof createPendingCheckoutOrder>>;
  purchase: Awaited<ReturnType<typeof resolveCheckoutPurchase>>;
}) {
  const payment = await createFreedomPayPayment({
    amount: input.purchase.amount,
    currency: input.purchase.currency,
    customerEmail: input.order.customerEmail,
    customerPhone: input.order.customerPhone,
    description: input.purchase.displayTitle,
    orderId: input.order.id,
  });

  await db.order.update({
    where: { id: input.order.id },
    data: {
      providerOrderId: payment.responsePayload.pg_payment_id,
    },
  });

  await logIntegrationEvent({
    source: "freedompay",
    event: "init-payment",
    orderId: input.order.id,
    status: "SUCCESS",
    requestBody: payment.requestPayload,
    responseBody: payment.responsePayload,
  });

  return {
    orderId: input.order.id,
    publishableKey: null,
    url: payment.responsePayload.pg_redirect_url,
  };
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = createCheckoutSessionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid checkout payload",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  try {
    if (!isCheckoutProviderAvailable(parsed.data.provider)) {
      return NextResponse.json(
        {
          error: `${parsed.data.provider} is unavailable`,
        },
        { status: 400 }
      );
    }

    const purchase = await resolveCheckoutPurchase({
      productSlug: parsed.data.productSlug,
      tariffId: parsed.data.tariffId,
      currency: parsed.data.currency,
      purchaseType: parsed.data.purchaseType,
    });
    const order = await createPendingCheckoutOrder({
      purchase,
      provider: parsed.data.provider,
      customerName: parsed.data.customerName,
      customerEmail: parsed.data.customerEmail,
      customerPhone: parsed.data.customerPhone,
      giftRecipientEmail: parsed.data.giftRecipientEmail ?? null,
    });

    try {
      const result =
        parsed.data.provider === "FREEDOMPAY"
          ? await createFreedomPayCheckoutSession({
              order,
              purchase,
            })
          : await createStripeCheckoutSession({
              customerEmail: parsed.data.customerEmail,
              giftRecipientEmail: parsed.data.giftRecipientEmail ?? null,
              order,
              purchase,
              purchaseType: parsed.data.purchaseType,
            });

      return NextResponse.json(result);
    } catch (error) {
      const message =
        parsed.data.provider === "FREEDOMPAY"
          ? getFreedomPayErrorMessage(error)
          : getErrorMessage(error);

      await db.order.update({
        where: { id: order.id },
        data: {
          status: "FAILED",
          syncError: message,
        },
      });

      await logIntegrationEvent({
        source: parsed.data.provider === "FREEDOMPAY" ? "freedompay" : "stripe",
        event: parsed.data.provider === "FREEDOMPAY" ? "init-payment" : "checkout-session-create",
        orderId: order.id,
        status: "FAILED",
        requestBody: {
          currency: purchase.currency,
          orderId: order.id,
          provider: parsed.data.provider,
          purchaseType: parsed.data.purchaseType,
        },
        error: message,
      });

      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
