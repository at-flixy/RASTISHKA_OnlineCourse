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
  const product = await db.product.findUnique({ where: { id }, select: { isPublished: true } });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.product.update({
    where: { id },
    data: { isPublished: !product.isPublished },
    select: { id: true, isPublished: true },
  });

  return NextResponse.json(updated);
}
