import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { z } from "zod";

const reorderSchema = z.object({
  items: z.array(z.object({ id: z.string(), order: z.number().int() })),
});

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await db.$transaction(
    parsed.data.items.map(({ id, order }) =>
      db.product.update({ where: { id }, data: { order } })
    )
  );

  return NextResponse.json({ ok: true });
}
