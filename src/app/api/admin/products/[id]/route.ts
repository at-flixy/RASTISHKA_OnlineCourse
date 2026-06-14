import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { z } from "zod";

const tariffSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  tagline: z.string().optional().or(z.literal("")),
  priceKgs: z.number().int().nonnegative(),
  priceUsd: z.number().int().nonnegative(),
  durationLabel: z.string().min(1),
  includes: z.array(z.string()),
  getcourseGroupName: z.string().min(1),
  order: z.number().int().default(0),
});

const updateProductSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  title: z.string().min(1).optional(),
  shortDescription: z.string().min(1).optional(),
  longDescription: z.string().optional(),
  thumbnailUrl: z.string().optional().nullable(),
  durationLabel: z.string().optional().nullable(),
  priceKgs: z.number().int().nonnegative().optional().nullable(),
  priceUsd: z.number().int().nonnegative().optional().nullable(),
  getcourseGroupName: z.string().optional().nullable(),
  ctaTitle: z.string().optional().nullable(),
  ctaSubtitle: z.string().optional().nullable(),
  ctaFeatures: z.array(z.string()).optional(),
  ctaButtonLabel: z.string().optional().nullable(),
  isPublished: z.boolean().optional(),
  tariffs: z.array(tariffSchema).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const product = await db.product.findUnique({
    where: { id },
    include: { tariffs: { orderBy: { order: "asc" } } },
  });

  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { tariffs, ...productData } = parsed.data;

  // Update product
  await db.product.update({
    where: { id },
    data: productData,
  });

  // If tariffs provided — replace all
  if (tariffs !== undefined) {
    // Delete all old tariffs not in the new list
    const existingIds = tariffs.filter((t) => t.id).map((t) => t.id!);
    await db.tariff.deleteMany({
      where: { productId: id, id: { notIn: existingIds } },
    });

    // Upsert each tariff
    for (const tariff of tariffs) {
      const { id: tariffId, ...tariffData } = tariff;
      if (tariffId) {
        await db.tariff.update({
          where: { id: tariffId },
          data: { ...tariffData, tagline: tariffData.tagline || null },
        });
      } else {
        await db.tariff.create({
          data: {
            ...tariffData,
            tagline: tariffData.tagline || null,
            productId: id,
          },
        });
      }
    }
  }

  const updated = await db.product.findUnique({
    where: { id },
    include: { tariffs: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
