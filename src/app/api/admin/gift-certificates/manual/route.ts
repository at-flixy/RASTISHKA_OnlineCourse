import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  generateGiftCertificateCode,
  getGiftCertificateTitle,
} from "@/lib/gift-certificates";
import { logIntegrationEvent } from "@/lib/integration-log";
import { sendGiftCertificateRecipientEmail } from "@/lib/email";

export const runtime = "nodejs";

const manualGiftCertificateSchema = z.object({
  currency: z.enum(["KGS", "USD"]).default("KGS"),
  productId: z.string().min(1),
  recipientEmail: z.string().email().optional().nullable(),
  tariffId: z.string().min(1).optional().nullable(),
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

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = manualGiftCertificateSchema.safeParse(body);

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
    const product = await db.product.findUnique({
      where: { id: parsed.data.productId },
      include: { tariffs: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Курс не найден" }, { status: 404 });
    }

    const tariff = parsed.data.tariffId
      ? product.tariffs.find((item) => item.id === parsed.data.tariffId)
      : null;

    if (parsed.data.tariffId && !tariff) {
      return NextResponse.json({ error: "Тариф не найден" }, { status: 404 });
    }

    const priceSource = tariff ?? product;
    const amount = parsed.data.currency === "KGS" ? priceSource.priceKgs : priceSource.priceUsd;

    if (amount == null) {
      return NextResponse.json({ error: "Для выбранной валюты не настроена цена" }, { status: 400 });
    }

    const code = await generateGiftCertificateCode();
    const certificate = await db.giftCertificate.create({
      data: {
        amount,
        amountKgs: priceSource.priceKgs ?? null,
        code,
        currency: parsed.data.currency,
        productId: product.id,
        recipientEmail: parsed.data.recipientEmail?.trim().toLowerCase() || null,
        tariffId: tariff?.id ?? null,
      },
    });

    await logIntegrationEvent({
      source: "gift-certificate",
      event: "manual-issued",
      status: "SUCCESS",
      requestBody: {
        adminEmail: session.user.email,
        certificateId: certificate.id,
        code,
        productId: product.id,
        tariffId: tariff?.id ?? null,
      },
    });

    if (certificate.recipientEmail) {
      await sendGiftCertificateRecipientEmail(certificate.recipientEmail, {
        amount: certificate.amount,
        code: certificate.code,
        currency: certificate.currency,
        customerName: "Администратор",
        title: getGiftCertificateTitle({ product, tariff }),
      });
    }

    return NextResponse.json(await getCertificate(certificate.id), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
