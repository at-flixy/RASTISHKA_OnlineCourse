import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

// Max file size: 5MB
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Невалидный запрос" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Файл не найден" }, { status: 400 });

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Разрешены только изображения (JPG, PNG, WebP, GIF, SVG)" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Файл слишком большой. Максимум 5 МБ" },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const media = await db.mediaFile.create({
    data: {
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      data: buffer,
    },
    select: { id: true, filename: true, size: true, mimeType: true },
  });

  return NextResponse.json({
    id: media.id,
    filename: media.filename,
    size: media.size,
    mimeType: media.mimeType,
    url: `/api/media/${media.id}`,
  });
}
