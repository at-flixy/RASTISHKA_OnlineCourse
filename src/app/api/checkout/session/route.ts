import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logIntegrationEvent } from "@/lib/integration-log";
import {
  createCheckoutSessionSchema,
  resolveCheckoutPurchase,
} from "@/lib/payments/catalog";
import { getStripe, getStripePaymentIntentId } from "@/lib/payments/stripe";
import { getSiteUrl } from "@/lib/site-url";

export const runtime = "nodejs";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
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
    const purchase = await resolveCheckoutPurchase({
      productSlug: parsed.data.productSlug,
      tariffId: parsed.data.tariffId,
      currency: parsed.data.currency,
      purchaseType: parsed.data.purchaseType,
    });
    const priceKgs = purchase.tariff?.priceKgs ?? purchase.product.priceKgs;
    const priceUsd = purchase.tariff?.priceUsd ?? purchase.product.priceUsd;

    if (priceKgs == null || priceUsd == null) {
      return NextResponse.json(
        { error: "Product must have both KGS and USD prices configured" },
        { status: 400 }
      );
    }

    const order = await db.order.create({
      data: {
        customerEmail: parsed.data.customerEmail,
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone,
        giftRecipientEmail:
          parsed.data.purchaseType === "GIFT_CERTIFICATE"
            ? parsed.data.giftRecipientEmail ?? parsed.data.customerEmail
            : null,
        amount: purchase.amount,
        currency: purchase.currency,
        provider: "STRIPE",
        purchaseType: parsed.data.purchaseType,
        status: "PENDING",
        syncStatus: "PENDING",
        items: {
          create: {
            productId: purchase.product.id,
            tariffId: purchase.tariff?.id ?? null,
            title: purchase.displayTitle,
            priceKgs,
            priceUsd,
          },
        },
      },
    });

    const stripe = getStripe();
    const siteUrl = getSiteUrl();
    const metadata = {
      orderId: order.id,
      productId: purchase.product.id,
      tariffId: purchase.tariff?.id ?? "",
      purchaseType: parsed.data.purchaseType,
      currency: purchase.currency,
      customerEmail: parsed.data.customerEmail,
      giftRecipientEmail: parsed.data.giftRecipientEmail ?? "",
    };

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: `${siteUrl}/checkout/success?order=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/checkout/cancel?order=${order.id}`,
        client_reference_id: order.id,
        customer_email: order.customerEmail,
        locale: "auto",
        metadata,
        payment_intent_data: {
          metadata,
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: purchase.currency.toLowerCase(),
              unit_amount: purchase.amount,
              product_data: {
                name: purchase.displayTitle,
                description: purchase.description,
              },
            },
          },
        ],
      });

      const paymentIntentId = getStripePaymentIntentId(session.payment_intent);

      await db.order.update({
        where: { id: order.id },
        data: {
          providerOrderId: session.id,
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
        },
      });

      await logIntegrationEvent({
        source: "stripe",
        event: "checkout-session-create",
        orderId: order.id,
        status: "SUCCESS",
        requestBody: metadata,
        responseBody: {
          sessionId: session.id,
          paymentIntentId,
          amount: purchase.amount,
          currency: purchase.currency,
        },
      });

      if (!session.url) {
        return NextResponse.json({ error: "Stripe session URL is missing" }, { status: 500 });
      }

      return NextResponse.json({
        url: session.url,
        orderId: order.id,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? null,
      });
    } catch (error) {
      const message = getErrorMessage(error);

      await db.order.update({
        where: { id: order.id },
        data: {
          status: "FAILED",
          syncError: message,
        },
      });

      await logIntegrationEvent({
        source: "stripe",
        event: "checkout-session-create",
        orderId: order.id,
        status: "FAILED",
        requestBody: metadata,
        error: message,
      });

      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
