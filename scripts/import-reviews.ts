import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { resolveLandingContent, type LandingContent } from "@/lib/landing-content";

function ensureSslMode(databaseUrl: string) {
  const url = new URL(databaseUrl);

  if (!url.searchParams.has("sslmode")) {
    url.searchParams.set("sslmode", "require");
  }

  if (url.searchParams.get("sslmode") === "require" && !url.searchParams.has("uselibpqcompat")) {
    url.searchParams.set("uselibpqcompat", "true");
  }

  return url.toString();
}

function getScriptDatabaseUrl() {
  const directUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
  const publicUrl = process.env.DATABASE_PUBLIC_URL ?? null;

  if (typeof directUrl === "string") {
    const selectedUrl =
      directUrl.includes(".railway.internal") && typeof publicUrl === "string"
        ? publicUrl
        : directUrl;

    return ensureSslMode(selectedUrl);
  }

  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith("HEROKU_POSTGRESQL_") && key.endsWith("_URL") && value) {
      return ensureSslMode(value);
    }
  }

  throw new Error("DATABASE_URL is required");
}

const adapter = new PrismaPg({ connectionString: getScriptDatabaseUrl() });
const db = new PrismaClient({ adapter });

type ReviewSeed = {
  filePath: string;
  name: string;
  source: string;
  description: string;
  alt: string;
};

const REVIEW_SEEDS: ReviewSeed[] = [
  {
    filePath: "C:\\Users\\Lenovo\\Downloads\\Telegram Desktop\\20260417_193506.jpg",
    name: "Повышение квалификации",
    source: "Отзыв",
    description: "Отмечают структуру курса, сильную практику и полезные бонусные уроки.",
    alt: "Скриншот длинного отзыва о курсе повышения квалификации по детскому массажу",
  },
  {
    filePath: "C:\\Users\\Lenovo\\Downloads\\Telegram Desktop\\20260417_193653.jpg",
    name: "Техники простым языком",
    source: "Отзыв",
    description: "Благодарность за понятное объяснение техник массажа и практическую подачу.",
    alt: "Скриншот короткого отзыва с благодарностью за понятное объяснение техник массажа",
  },
  {
    filePath: "C:\\Users\\Lenovo\\Downloads\\Telegram Desktop\\20260417_193738.jpg",
    name: "Ценные знания и советы",
    source: "Отзыв",
    description: "Отзыв о профессионализме, терпении, поддержке и организации обучения.",
    alt: "Скриншот отзыва о ценных знаниях и практических советах по массажу",
  },
  {
    filePath: "C:\\Users\\Lenovo\\Downloads\\Telegram Desktop\\20260417_193827.jpg",
    name: "Искреннее отношение",
    source: "Отзыв",
    description: "Подчёркивают душевную подачу материала и всесторонний подход к делу.",
    alt: "Скриншот отзыва с благодарностью за искреннее отношение и подачу материала",
  },
  {
    filePath: "C:\\Users\\Lenovo\\Downloads\\Telegram Desktop\\20260417_193851.jpg",
    name: "Уверенность в работе",
    source: "Отзыв",
    description: "После обучения стало легче и увереннее работать с малышами даже после курса.",
    alt: "Скриншот отзыва о том, что после курса стало легче работать с малышами",
  },
  {
    filePath: "C:\\Users\\Lenovo\\Downloads\\Telegram Desktop\\20260417_193958.jpg",
    name: "Глубокое обучение и поддержка",
    source: "Отзыв",
    description: "Благодарность за системное обучение, опыт и тёплое сообщество учеников.",
    alt: "Скриншот развёрнутого отзыва о глубоком обучении и поддержке на курсе",
  },
  {
    filePath: "C:\\Users\\Lenovo\\Downloads\\Telegram Desktop\\20260417_193922.jpg",
    name: "Практика дома",
    source: "Отзыв",
    description: "Техники начали применять дома сразу после обучения и увидели пользу.",
    alt: "Скриншот отзыва о домашней практике после курса по массажу",
  },
  {
    filePath: "C:\\Users\\Lenovo\\Downloads\\Telegram Desktop\\20260417_194242.jpg",
    name: "Первые результаты за день",
    source: "Фотоотчёт",
    description: "После первого дня массажа живота мама отмечает спокойный сон и явный отклик ребёнка.",
    alt: "Скриншот фотоотчёта о первых результатах после массажа живота",
  },
  {
    filePath: "C:\\Users\\Lenovo\\Downloads\\Telegram Desktop\\20260417_193428.jpg",
    name: "Курс для родителей особенных детей",
    source: "Отзыв",
    description: "Отзыв о полезном курсе для родителей детей с ЗПР, ЗРР, РАС и аутизмом.",
    alt: "Скриншот отзыва о курсе оздоровительного массажа для особенных детей",
  },
  {
    filePath: "C:\\Users\\Lenovo\\Downloads\\Telegram Desktop\\20260417_193556.jpg",
    name: "Навыки и уверенность",
    source: "Отзыв",
    description: "Обучение помогло почувствовать мышцы, поставить руки и работать увереннее.",
    alt: "Скриншот отзыва о приобретённых навыках и уверенности после обучения массажу",
  },
  {
    filePath: "C:\\Users\\Lenovo\\Downloads\\Telegram Desktop\\20260417_170735.jpg",
    name: "Новые техники и смелость в работе",
    source: "Отзыв",
    description: "Курс дал новые техники, навыки и уверенность при работе с детьми.",
    alt: "Скриншот короткого отзыва о новых техниках и уверенности в работе с детьми",
  },
  {
    filePath: "C:\\Users\\Lenovo\\Downloads\\Telegram Desktop\\20260417_194123.jpg",
    name: "Полезная консультация",
    source: "Отзыв",
    description: "Отзыв о точной консультации, понятных рекомендациях и ожидании хорошего результата.",
    alt: "Скриншот отзыва о полезной консультации и рекомендациях по ребёнку",
  },
];

async function ensurePublicReviewAsset(filePath: string) {
  const filename = path.basename(filePath);
  const targetDir = path.join(process.cwd(), "public", "reviews");
  const targetPath = path.join(targetDir, filename);

  await mkdir(targetDir, { recursive: true });
  await copyFile(filePath, targetPath);

  return `/reviews/${filename}`;
}

function buildLandingContent(content: LandingContent, items: LandingContent["reviews"]["items"]) {
  return {
    ...content,
    reviews: {
      title: "Отзывы и истории учеников",
      subtitle: "Живые переписки, фотоотчёты и впечатления учеников после обучения и практики.",
      items,
    },
  };
}

async function main() {
  const settings = await db.siteSettings.findUnique({ where: { id: 1 } });
  const currentContent = resolveLandingContent(settings?.landingContent);

  const items: LandingContent["reviews"]["items"] = [];

  for (const review of REVIEW_SEEDS) {
    const imageUrl = await ensurePublicReviewAsset(review.filePath);

    items.push({
      name: review.name,
      source: review.source,
      description: review.description,
      alt: review.alt,
      imageUrl,
    });
  }

  const landingContent = buildLandingContent(currentContent, items);

  await db.siteSettings.upsert({
    where: { id: 1 },
    update: { landingContent },
    create: {
      id: 1,
      landingContent,
    },
  });

  console.log(`Imported ${items.length} reviews into landing content.`);
}

main()
  .catch((error) => {
    console.error("Failed to import reviews:", error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
