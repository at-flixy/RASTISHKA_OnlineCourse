import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { sendGiftCertificateRecipientEmail } from "@/lib/email";
import { getGiftCertificateTitle } from "@/lib/gift-certificates";
import { logIntegrationEvent } from "@/lib/integration-log";

export const runtime = "nodejs";

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

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const certificate = await getCertificate(id);

    if (!certificate) {
      return NextResponse.json({ error: "Сертификат не найден" }, { status: 404 });
    }

    if (!certificate.recipientEmail) {
      return NextResponse.json({ error: "У сертификата не указан email получателя" }, { status: 400 });
    }

    if (certificate.voidedAt) {
      return NextResponse.json({ error: "Аннулированный сертификат нельзя отправить" }, { status: 400 });
    }

    await sendGiftCertificateRecipientEmail(certificate.recipientEmail, {
      amount: certificate.amount,
      code: certificate.code,
      currency: certificate.currency,
      customerName: "Администратор",
      title: getGiftCertificateTitle(certificate),
    });

    await logIntegrationEvent({
      source: "gift-certificate",
      event: "resend",
      status: "SUCCESS",
      requestBody: {
        adminEmail: session.user.email,
        certificateId: id,
        recipientEmail: certificate.recipientEmail,
      },
    });

    return NextResponse.json(certificate);
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
