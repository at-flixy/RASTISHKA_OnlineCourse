import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { z } from "zod";

const nullableStringSchema = z.string().optional().nullable();

const tariffSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  tagline: nullableStringSchema,
  priceKgs: z.number().int().nonnegative(),
  priceUsd: z.number().int().nonnegative(),
  durationLabel: z.string().min(1),
  includes: z.array(z.string()),
  getcourseGroupName: z.string().min(1),
  order: z.number().int().default(0),
});

const productSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only"),
  title: z.string().min(1),
  shortDescription: z.string().min(1),
  longDescription: z.string().default(""),
  thumbnailUrl: nullableStringSchema,
  durationLabel: nullableStringSchema,
  priceKgs: z.number().int().nonnegative().optional().nullable(),
  priceUsd: z.number().int().nonnegative().optional().nullable(),
  getcourseGroupName: nullableStringSchema,
  isPublished: z.boolean().default(false),
  tariffs: z.array(tariffSchema).default([]),
});

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const products = await db.product.findMany({
    orderBy: { order: "asc" },
    include: {
      tariffs: { orderBy: { order: "asc" } },
      _count: { select: { orderItems: true } },
    },
  });

  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const maxOrder = await db.product.aggregate({ _max: { order: true } });
  const nextOrder = (maxOrder._max.order ?? 0) + 1;
  const { tariffs, ...productData } = parsed.data;

  const product = await db.product.create({
    data: {
      ...productData,
      thumbnailUrl: productData.thumbnailUrl || null,
      durationLabel: productData.durationLabel || null,
      getcourseGroupName: productData.getcourseGroupName || null,
      order: nextOrder,
      tariffs:
        tariffs.length > 0
          ? {
              create: tariffs.map((tariff) => ({
                name: tariff.name,
                priceKgs: tariff.priceKgs,
                priceUsd: tariff.priceUsd,
                durationLabel: tariff.durationLabel,
                includes: tariff.includes,
                getcourseGroupName: tariff.getcourseGroupName,
                order: tariff.order,
                tagline: tariff.tagline || null,
              })),
            }
          : undefined,
    },
    include: { tariffs: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(product, { status: 201 });
}
