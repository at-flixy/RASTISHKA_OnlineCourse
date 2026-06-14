import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { logIntegrationEvent } from "@/lib/integration-log";

export const runtime = "nodejs";

const voidGiftCertificateSchema = z.object({
  reason: z.string().trim().max(500).optional().nullable(),
});

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

async function getCertificate(id: string) {
  return db.giftCertificate.findUnique({
    where: { id },
    include: {
      order: { select: { id: true } },
      product: { select: { id: true, slug: true, title: true } },
      redeemedOrder: { select: { id: true } },
      tariff: { select: { id: true, name: true } },
    },
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = voidGiftCertificateSchema.safeParse(body);

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
    const certificate = await db.giftCertificate.findUnique({ where: { id } });

    if (!certificate) {
      return NextResponse.json({ error: "Сертификат не найден" }, { status: 404 });
    }

    if (certificate.redeemedAt) {
      return NextResponse.json({ error: "Погашенный сертификат нельзя аннулировать" }, { status: 400 });
    }

    await db.giftCertificate.update({
      where: { id },
      data: {
        voidReason: parsed.data.reason?.trim() || null,
        voidedAt: new Date(),
      },
    });

    await logIntegrationEvent({
      source: "gift-certificate",
      event: "voided",
      status: "SUCCESS",
      requestBody: {
        adminEmail: session.user.email,
        certificateId: id,
        reason: parsed.data.reason ?? null,
      },
    });

    return NextResponse.json(await getCertificate(id));
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
