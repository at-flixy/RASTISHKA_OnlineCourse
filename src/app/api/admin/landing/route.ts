import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const statSchema = z.object({
  value: z.string(),
  label: z.string(),
});

const cardSchema = z.object({
  title: z.string(),
  desc: z.string(),
});

const landingSchema = z.object({
  hero: z.object({
    badge: z.string(),
    titleLine1: z.string(),
    titleHighlight: z.string(),
    titleLine2: z.string(),
    description: z.string(),
    ctaButton: z.string(),
    whatsappButton: z.string(),
  }),
  stats: z.array(statSchema).length(4),
  courses: z.object({
    title: z.string(),
    subtitle: z.string(),
  }),
  about: z.object({
    title: z.string(),
    bio: z.string(),
    linkText: z.string(),
    cards: z.array(cardSchema).length(4),
  }),
  gift: z.object({
    title: z.string(),
    subtitle: z.string(),
    button: z.string(),
  }),
});

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
  const parsed = landingSchema.safeParse(body);
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
