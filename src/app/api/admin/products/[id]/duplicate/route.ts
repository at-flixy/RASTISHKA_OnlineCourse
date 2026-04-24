import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/authz";
import { db } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const product = await db.product.findUnique({
    where: { id },
    include: { tariffs: { orderBy: { order: "asc" } } },
  });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const maxOrder = await db.product.aggregate({ _max: { order: true } });
  const nextOrder = (maxOrder._max.order ?? 0) + 1;

  const newSlug = `${product.slug}-copy-${Date.now()}`;

  const { id: _id, createdAt: _c, updatedAt: _u, tariffs, ...rest } = product;

  const newProduct = await db.product.create({
    data: {
      ...rest,
      slug: newSlug,
      title: `${product.title} (копия)`,
      isPublished: false,
      order: nextOrder,
      tariffs: {
        create: tariffs.map(({ id: _tid, productId: _pid, ...t }) => ({
          ...t,
        })),
      },
    },
    include: { tariffs: true },
  });

  return NextResponse.json(newProduct, { status: 201 });
}
