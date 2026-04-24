import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { z } from "zod";

const pageSchema = z.object({
  title: z.string().min(1),
  content: z.string().default(""),
  seoTitle: z.string().optional().or(z.literal("")),
  seoDesc: z.string().optional().or(z.literal("")),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await requireAdminSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const page = await db.page.findUnique({ where: { slug } });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(page);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await requireAdminSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const body = await request.json();
  const parsed = pageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const page = await db.page.upsert({
    where: { slug },
    update: {
      ...parsed.data,
      seoTitle: parsed.data.seoTitle || null,
      seoDesc: parsed.data.seoDesc || null,
    },
    create: {
      slug,
      ...parsed.data,
      seoTitle: parsed.data.seoTitle || null,
      seoDesc: parsed.data.seoDesc || null,
    },
  });

  return NextResponse.json(page);
}
