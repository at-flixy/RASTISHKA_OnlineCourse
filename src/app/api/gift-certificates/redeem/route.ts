import { NextResponse } from "next/server";
import { z } from "zod";
import { redeemGiftCertificate } from "@/lib/gift-certificates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const redeemGiftCertificateSchema = z.object({
  code: z.string().min(1).max(80),
  customerEmail: z.string().email(),
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().max(40).optional().nullable(),
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

  const parsed = redeemGiftCertificateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid gift certificate redemption payload",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  try {
    const order = await redeemGiftCertificate(parsed.data);

    return NextResponse.json({
      orderId: order.id,
      redirectUrl: `/checkout/success?order=${order.id}`,
    });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
