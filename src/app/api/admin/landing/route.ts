import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { landingContentSchema } from "@/lib/landing-content";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await db.siteSettings.findUnique({ where: { id: 1 } });
  return NextResponse.json(settings?.landingContent ?? null);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = landingContentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await db.siteSettings.upsert({
    where: { id: 1 },
    update: { landingContent: parsed.data },
    create: { id: 1, landingContent: parsed.data },
  });

  return NextResponse.json({ ok: true });
}
