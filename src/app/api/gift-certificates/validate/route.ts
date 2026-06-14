import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getGiftCertificateForRedemption,
  getGiftCertificateTitle,
} from "@/lib/gift-certificates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const validateGiftCertificateSchema = z.object({
  code: z.string().min(1).max(80),
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

  const parsed = validateGiftCertificateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid gift certificate payload",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  try {
    const certificate = await getGiftCertificateForRedemption(parsed.data.code);

    return NextResponse.json({
      amount: certificate.amount,
      code: certificate.code,
      currency: certificate.currency,
      product: certificate.product,
      tariff: certificate.tariff,
      title: getGiftCertificateTitle(certificate),
    });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
