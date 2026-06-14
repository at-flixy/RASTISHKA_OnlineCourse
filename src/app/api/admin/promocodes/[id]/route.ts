import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { normalizePromoCode } from "@/lib/payments/pricing";

export const runtime = "nodejs";

const promoCodeSchema = z.object({
  appliesToAllProducts: z.boolean().default(false),
  code: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().nullable(),
  endsAt: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  maxRedemptions: z.number().int().positive().optional().nullable(),
  perCustomerLimit: z.number().int().positive().optional().nullable(),
  percentOff: z.number().int().min(1).max(100),
  productIds: z.array(z.string().min(1)).default([]),
  startsAt: z.string().optional().nullable(),
});

function parseOptionalDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Некорректная дата");
  }

  return date;
}

function normalizePromoInput(input: z.infer<typeof promoCodeSchema>) {
  const code = normalizePromoCode(input.code);

  if (!code) {
    throw new Error("Укажите код промокода");
  }

  if (!input.appliesToAllProducts && input.productIds.length === 0) {
    throw new Error("Выберите хотя бы один курс или включите действие на все курсы");
  }

  return {
    appliesToAllProducts: input.appliesToAllProducts,
    code,
    description: input.description?.trim() || null,
    endsAt: parseOptionalDate(input.endsAt),
    isActive: input.isActive,
    maxRedemptions: input.maxRedemptions ?? null,
    perCustomerLimit: input.perCustomerLimit ?? null,
    percentOff: input.percentOff,
    productIds: input.appliesToAllProducts ? [] : Array.from(new Set(input.productIds)),
    startsAt: parseOptionalDate(input.startsAt),
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

async function getPromoCode(id: string) {
  return db.promoCode.findUnique({
    where: { id },
    include: {
      _count: {
        select: { redemptions: true },
      },
      productScopes: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          product: { order: "asc" },
        },
      },
    },
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = promoCodeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid promo code payload",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  try {
    const input = normalizePromoInput(parsed.data);

    await db.$transaction([
      db.promoCode.update({
        where: { id },
        data: {
          appliesToAllProducts: input.appliesToAllProducts,
          code: input.code,
          description: input.description,
          endsAt: input.endsAt,
          isActive: input.isActive,
          maxRedemptions: input.maxRedemptions,
          perCustomerLimit: input.perCustomerLimit,
          percentOff: input.percentOff,
          startsAt: input.startsAt,
        },
      }),
      db.promoCodeProduct.deleteMany({ where: { promoCodeId: id } }),
      ...input.productIds.map((productId) =>
        db.promoCodeProduct.create({
          data: {
            productId,
            promoCodeId: id,
          },
        })
      ),
    ]);

    const updated = await getPromoCode(id);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    await db.promoCode.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
