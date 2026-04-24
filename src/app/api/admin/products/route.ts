import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { z } from "zod";

const productSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Только строчные буквы, цифры и дефис"),
  title: z.string().min(1),
  shortDescription: z.string().min(1),
  longDescription: z.string().default(""),
  thumbnailUrl: z.string().optional().or(z.literal("")),
  durationLabel: z.string().optional().or(z.literal("")),
  priceKgs: z.number().int().nonnegative().optional().nullable(),
  priceUsd: z.number().int().nonnegative().optional().nullable(),
  getcourseGroupName: z.string().optional().or(z.literal("")),
  isPublished: z.boolean().default(false),
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

  const product = await db.product.create({
    data: {
      ...parsed.data,
      thumbnailUrl: parsed.data.thumbnailUrl || null,
      durationLabel: parsed.data.durationLabel || null,
      getcourseGroupName: parsed.data.getcourseGroupName || null,
      order: nextOrder,
    },
    include: { tariffs: true },
  });

  return NextResponse.json(product, { status: 201 });
}
