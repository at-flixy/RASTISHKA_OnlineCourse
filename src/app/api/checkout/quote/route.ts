import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeEmail } from "@/lib/account";
import { currencySchema, purchaseTypeSchema, resolveCheckoutPurchase } from "@/lib/payments/catalog";
import { quoteCheckoutPurchase } from "@/lib/payments/pricing";

export const runtime = "nodejs";

const checkoutQuoteSchema = z.object({
  productSlug: z.string().min(1),
  tariffId: z.string().min(1).optional().nullable(),
  purchaseType: purchaseTypeSchema.default("COURSE"),
  currency: currencySchema.default("KGS"),
  customerEmail: z.string().email().optional().nullable(),
  promoCode: z.string().max(80).optional().nullable(),
});

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

  const parsed = checkoutQuoteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid checkout quote payload",
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
    const quote = await quoteCheckoutPurchase({
      customerEmail: parsed.data.customerEmail ? normalizeEmail(parsed.data.customerEmail) : null,
      promoCode: parsed.data.promoCode,
      purchase,
    });

    return NextResponse.json(quote);
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
