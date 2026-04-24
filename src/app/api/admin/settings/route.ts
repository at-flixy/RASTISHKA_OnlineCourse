import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { z } from "zod";

const settingsSchema = z.object({
  instagramUrl: z.string().optional().or(z.literal("")),
  whatsappUrl: z.string().optional().or(z.literal("")),
  telegramUrl: z.string().optional().or(z.literal("")),
  heroImageUrl: z.string().optional().or(z.literal("")),
  metaPixelId: z.string().optional().or(z.literal("")),
  yandexMetricaId: z.string().optional().or(z.literal("")),
  gaId: z.string().optional().or(z.literal("")),
});

export async function GET() {
  const session = await requireAdminSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await db.siteSettings.findUnique({ where: { id: 1 } });
  return NextResponse.json(settings ?? { id: 1 });
}

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const nullify = (v: string | undefined) => v || null;

  const settings = await db.siteSettings.upsert({
    where: { id: 1 },
    update: {
      instagramUrl: nullify(parsed.data.instagramUrl),
      whatsappUrl: nullify(parsed.data.whatsappUrl),
      telegramUrl: nullify(parsed.data.telegramUrl),
      heroImageUrl: nullify(parsed.data.heroImageUrl),
      metaPixelId: nullify(parsed.data.metaPixelId),
      yandexMetricaId: nullify(parsed.data.yandexMetricaId),
      gaId: nullify(parsed.data.gaId),
    },
    create: {
      id: 1,
      instagramUrl: nullify(parsed.data.instagramUrl),
      whatsappUrl: nullify(parsed.data.whatsappUrl),
      telegramUrl: nullify(parsed.data.telegramUrl),
      heroImageUrl: nullify(parsed.data.heroImageUrl),
      metaPixelId: nullify(parsed.data.metaPixelId),
      yandexMetricaId: nullify(parsed.data.yandexMetricaId),
      gaId: nullify(parsed.data.gaId),
    },
  });

  return NextResponse.json(settings);
}
