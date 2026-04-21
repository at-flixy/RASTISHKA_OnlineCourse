import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logIntegrationEvent } from "@/lib/integration-log";
import { fulfillPaidOrder } from "@/lib/payments/fulfillment";
import {
  getStripe,
  getStripePaymentIntentId,
  getStripeWebhookSecret,
} from "@/lib/payments/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function getOrderIdFromMetadata(
  metadata: Stripe.Metadata | null | undefined,
  fallback?: string | null
) {
  return metadata?.orderId ?? fallback ?? null;
}

function getOrderIdFromEventObject(object: unknown) {
  if (!object || typeof object !== "object") {
    return null;
  }

  const candidate = object as {
    metadata?: Stripe.Metadata | null;
    client_reference_id?: string | null;
  };

  return getOrderIdFromMetadata(candidate.metadata, candidate.client_reference_id);
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const orderId = getOrderIdFromMetadata(session.metadata, session.client_reference_id);

  if (!orderId) {
    throw new Error("Stripe session metadata.orderId is missing");
  }

  const existingOrder = await db.order.findUnique({
    where: { id: orderId },
    select: { paidAt: true },
  });

  if (!existingOrder) {
    throw new Error("Order not found");
  }

  const paymentIntentId = getStripePaymentIntentId(session.payment_intent);

  await db.order.update({
    where: { id: orderId },
    data: {
      status: "PAID",
      paidAt: existingOrder.paidAt ?? new Date(),
      paidCurrency: session.currency?.toUpperCase() ?? null,
      providerOrderId: session.id,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
    },
  });

  await fulfillPaidOrder(orderId);

  return { orderId, paymentIntentId };
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const orderId = getOrderIdFromMetadata(session.metadata, session.client_reference_id);

  if (!orderId) {
    return { orderId: null };
  }

  await db.order.updateMany({
    where: {
      id: orderId,
      status: "PENDING",
    },
    data: {
      status: "FAILED",
      syncError: "Stripe Checkout session expired",
      providerOrderId: session.id,
      stripeCheckoutSessionId: session.id,
    },
  });

  return { orderId };
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const orderId = getOrderIdFromMetadata(paymentIntent.metadata);
  const errorMessage =
    paymentIntent.last_payment_error?.message ?? "Stripe PaymentIntent failed";

  if (!orderId) {
    return { orderId: null };
  }

  await db.order.updateMany({
    where: {
      id: orderId,
      status: "PENDING",
    },
    data: {
      status: "FAILED",
      syncError: errorMessage,
      stripePaymentIntentId: paymentIntent.id,
    },
  });

  return { orderId, paymentIntentId: paymentIntent.id };
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, getStripeWebhookSecret());
  } catch (error) {
    await logIntegrationEvent({
      source: "stripe",
      event: "webhook-signature",
      status: "FAILED",
      requestBody: rawBody,
      error: getErrorMessage(error),
    });

    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  try {
    let result: Record<string, unknown> = {};

    switch (event.type) {
      case "checkout.session.completed":
        result = await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "checkout.session.expired":
        result = await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
        break;
      case "payment_intent.payment_failed":
        result = await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        result = { ignored: true };
        break;
    }

    await logIntegrationEvent({
      source: "stripe",
      event: event.type,
      orderId:
        typeof result.orderId === "string"
          ? result.orderId
          : getOrderIdFromEventObject(event.data.object),
      status: "SUCCESS",
      responseBody: {
        eventId: event.id,
        result,
      },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = getErrorMessage(error);

    await logIntegrationEvent({
      source: "stripe",
      event: event.type,
      status: "FAILED",
      requestBody: {
        eventId: event.id,
      },
      error: message,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
