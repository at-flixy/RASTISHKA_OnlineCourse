import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeEmail } from "@/lib/account";
import { requireAdminSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { logIntegrationEvent } from "@/lib/integration-log";
import { fulfillPaidOrder } from "@/lib/payments/fulfillment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const grantAccessSchema = z.object({
  customerEmail: z.string().email(),
  customerName: z.string().trim().min(2).max(120).optional().or(z.literal("")),
  customerPhone: z.string().trim().max(40).optional().or(z.literal("")),
  productId: z.string().min(1),
  tariffId: z.string().min(1).optional().nullable(),
});

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function getFallbackName(email: string) {
  const [localPart] = email.split("@");
  return localPart || email;
}

export async function POST(request: Request) {
  const session = await requireAdminSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = grantAccessSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid access grant payload",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const customerEmail = normalizeEmail(parsed.data.customerEmail);
  const product = await db.product.findUnique({
    where: { id: parsed.data.productId },
    include: {
      tariffs: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const tariff =
    parsed.data.tariffId != null
      ? product.tariffs.find((item) => item.id === parsed.data.tariffId)
      : null;

  if (product.tariffs.length > 0 && !tariff) {
    return NextResponse.json({ error: "Choose a tariff for this course" }, { status: 400 });
  }

  if (parsed.data.tariffId && !tariff) {
    return NextResponse.json({ error: "Tariff not found for this course" }, { status: 404 });
  }

  const getcourseGroupNames = [product.getcourseGroupName, tariff?.getcourseGroupName].filter(
    (groupName): groupName is string => Boolean(groupName)
  );

  if (getcourseGroupNames.length === 0) {
    return NextResponse.json(
      { error: "GetCourse group is not configured for this course or tariff" },
      { status: 400 }
    );
  }

  const priceKgs = tariff?.priceKgs ?? product.priceKgs ?? 0;
  const priceUsd = tariff?.priceUsd ?? product.priceUsd ?? 0;
  const title = tariff ? `${product.title} - ${tariff.name}` : product.title;
  const order = await db.order.create({
    data: {
      amount: priceKgs,
      currency: "KGS",
      paidCurrency: "KGS",
      provider: "MANUAL",
      providerOrderId: `manual:${Date.now()}`,
      purchaseType: "COURSE",
      status: "PAID",
      paidAt: new Date(),
      syncStatus: "PENDING",
      customerEmail,
      customerName: parsed.data.customerName?.trim() || getFallbackName(customerEmail),
      customerPhone: parsed.data.customerPhone?.trim() || null,
      items: {
        create: {
          productId: product.id,
          tariffId: tariff?.id ?? null,
          title,
          priceKgs,
          priceUsd,
        },
      },
    },
  });

  await logIntegrationEvent({
    source: "manual",
    event: "access-grant",
    orderId: order.id,
    status: "SUCCESS",
    requestBody: {
      adminEmail: session.user.email,
      customerEmail,
      getcourseGroupNames,
      productId: product.id,
      tariffId: tariff?.id ?? null,
    },
  });

  try {
    await fulfillPaidOrder(order.id);
  } catch (error) {
    await logIntegrationEvent({
      source: "manual",
      event: "access-grant-fulfillment",
      orderId: order.id,
      status: "FAILED",
      error: getErrorMessage(error),
    });
  }

  const updatedOrder = await db.order.findUnique({
    where: { id: order.id },
    include: {
      items: {
        include: {
          product: { select: { title: true } },
          tariff: { select: { name: true } },
        },
      },
    },
  });
  const logs = await db.integrationLog.findMany({
    where: { orderId: order.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({
    order: updatedOrder,
    logs,
  });
}
