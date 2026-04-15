import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "@/lib/database-url";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
const db = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Admin User ────────────────────────────────────────────────────────────
  const email = process.env.ADMIN_EMAIL ?? "admin@masalova.com";
  const existingAdmin = await db.user.findUnique({ where: { email } });
  const password = process.env.ADMIN_PASSWORD;

  if (!existingAdmin) {
    const initialPassword = password ?? "admin123";
    const passwordHash = await bcrypt.hash(initialPassword, 12);

    await db.user.create({
      data: { email, name: "Светлана Масалова", passwordHash, role: "ADMIN" },
    });
  } else if (password) {
    const passwordHash = await bcrypt.hash(password, 12);

    await db.user.update({
      where: { email },
      data: { passwordHash },
    });
  }

  console.log(`✅ Admin user: ${email}`);

  // ─── Products ──────────────────────────────────────────────────────────────

  // 1. Основной курс с тарифами
  const mainCourse = await db.product.upsert({
    where: { slug: "massazh-osobennye-deti" },
    update: {},
    create: {
      slug: "massazh-osobennye-deti",
      title: "Массаж для особенных детей 2+",
      shortDescription:
        "Системный подход к коррекции через тело, нервную систему и ЖКТ. Для РАС, ЗПРР, СДВГ.",
      longDescription: `<p>Этот курс создан для родителей и специалистов, которые хотят не просто делать массаж, а понимать, как через тело влиять на состояние ребёнка.</p>
<p>Здесь нет механического повторения техник. Здесь вы учитесь видеть и понимать процессы, которые происходят в организме ребёнка.</p>
<h2>Для кого</h2>
<ul>
<li>Родители, которые хотят помогать ребёнку дома</li>
<li>Специалисты, работающие с РАС, ЗПРР, СДВГ</li>
<li>Те, кто хочет систему, а не набор техник</li>
</ul>`,
      order: 1,
      isPublished: true,
    },
  });

  const tariffs = [
    {
      name: "Базовый",
      tagline: "Для мам и тех, кто хочет начать с нуля",
      priceKgs: 9900,
      priceUsd: 115,
      durationLabel: "3 месяца",
      includes: [
        "Все видеоуроки",
        "Методические материалы",
        "Презентации к каждому уроку",
      ],
      getcourseGroupName: "massazh-2plus-basic",
      order: 1,
    },
    {
      name: "Продвинутый",
      tagline: "Для тех, кто хочет понимать глубже",
      priceKgs: 14900,
      priceUsd: 170,
      durationLabel: "6 месяцев",
      includes: [
        "Всё из базового тарифа",
        "Гайд «Кишечник и мозг»",
        "Лекция «Родовые травмы»",
        "Сертификат",
        "1 вопрос с личным ответом",
      ],
      getcourseGroupName: "massazh-2plus-advanced",
      order: 2,
    },
    {
      name: "Премиум",
      tagline: "Для тех, кто хочет результат и уверенность",
      priceKgs: 24900,
      priceUsd: 280,
      durationLabel: "12 месяцев",
      includes: [
        "Всё из предыдущих тарифов",
        "Сертификат о прохождении",
        "Индивидуальное сопровождение 3 месяца",
        "Личная проверка техники с разбором видео",
        "Разбор именно вашего ребёнка",
      ],
      getcourseGroupName: "massazh-2plus-premium",
      order: 3,
    },
  ];

  for (const t of tariffs) {
    await db.tariff.upsert({
      where: {
        // upsert by productId+name combo — use findFirst approach
        id: (
          await db.tariff.findFirst({
            where: { productId: mainCourse.id, name: t.name },
          })
        )?.id ?? "new",
      },
      update: t,
      create: { ...t, productId: mainCourse.id },
    });
  }
  console.log("✅ Main course + 3 tariffs");

  // 2–6. Простые продукты без тарифов
  const simpleProducts = [
    {
      slug: "grudnichkovyi-massazh",
      title: "Грудничковый массаж",
      shortDescription: "Мягкая и безопасная помощь малышу с первых месяцев жизни (2–6 мес).",
      priceKgs: 6900,
      priceUsd: 80,
      durationLabel: "3 месяца",
      getcourseGroupName: "grudnichkovyi-massazh",
      order: 2,
    },
    {
      slug: "spokoynyi-zhivotik",
      title: "Спокойный животик",
      shortDescription: "Мини-курс для малышей 2–12 мес. Помощь при коликах и газах без лекарств.",
      priceKgs: 990,
      priceUsd: 12,
      durationLabel: "3 месяца",
      getcourseGroupName: "spokoynyi-zhivotik",
      order: 3,
    },
    {
      slug: "vistseralnyi-massazh",
      title: "Висцеральный массаж",
      shortDescription: "Практическое видео по работе с животом ребёнка 2+.",
      priceKgs: 1200,
      priceUsd: 15,
      durationLabel: "3 месяца",
      getcourseGroupName: "vistseralnyi-massazh",
      order: 4,
    },
    {
      slug: "rodovye-travmy",
      title: "Родовые травмы и их влияние на развитие",
      shortDescription: "Лекция для мам. Как беременность и роды влияют на тело и поведение ребёнка.",
      priceKgs: 1200,
      priceUsd: 15,
      durationLabel: "3 месяца",
      getcourseGroupName: "rodovye-travmy",
      order: 5,
    },
    {
      slug: "kishechnik-i-mozg",
      title: "Гайд «Кишечник и мозг»",
      shortDescription: "Система для улучшения работы ЖКТ и общего состояния ребёнка. Для всех возрастов.",
      priceKgs: 2000,
      priceUsd: 23,
      durationLabel: "3 месяца",
      getcourseGroupName: "kishechnik-i-mozg",
      order: 6,
    },
  ];

  for (const p of simpleProducts) {
    const { priceKgs, priceUsd, durationLabel, getcourseGroupName, order, ...rest } = p;
    await db.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        ...rest,
        priceKgs,
        priceUsd,
        durationLabel,
        getcourseGroupName,
        order,
        isPublished: true,
        longDescription: `<p>${p.shortDescription}</p>`,
      },
    });
  }
  console.log("✅ 5 simple products");

  // ─── CMS Pages ─────────────────────────────────────────────────────────────
  const pages = [
    {
      slug: "home",
      title: "Главная",
      content: "<p>Контент главной страницы</p>",
      seoTitle: "Онлайн-курсы детского массажа | Светлана Масалова",
      seoDesc:
        "Онлайн-курсы детского и грудничкового массажа. Работа с особенными детьми (РАС, ЗПРР, СДВГ). Автор: Светлана Масалова, реабилитолог с 10-летним опытом.",
    },
    {
      slug: "about",
      title: "Обо мне",
      content: `<h1>Меня зовут Светлана Масалова</h1>
<p>Я реабилитолог, специалист по детскому и взрослому массажу, телесный терапевт и остеопрактик с опытом более 10 лет.</p>
<h2>Моя специализация</h2>
<p>Работаю с детьми с особенностями развития: аутизм, РАС, ЗПРР, СДВГ. Помогаю улучшать состояние ребёнка через глубокую работу с телом, нервной системой и ЖКТ.</p>
<h2>Мой подход</h2>
<p>Моя работа основана не на механическом выполнении техник, а на понимании того, как тело ребёнка реагирует на воздействие. Я соединяю анатомию и физиологию, сенсорную систему, работу кишечника и микробиома, телесную терапию.</p>
<h2>Моя миссия</h2>
<p>Помочь родителям и специалистам перейти от хаотичных действий к системному и осознанному подходу.</p>`,
      seoTitle: "Обо мне — Светлана Масалова, реабилитолог",
      seoDesc: "Светлана Масалова — реабилитолог, специалист по детскому массажу. Опыт 10+ лет работы с особенными детьми.",
    },
    {
      slug: "gift-certificate",
      title: "Подарочный сертификат",
      content: "<p>Подарите близкому человеку знания и здоровье для ребёнка.</p>",
      seoTitle: "Подарочный сертификат на курс массажа",
      seoDesc: "Подарите курс детского массажа. Сертификат приходит на email сразу после оплаты.",
    },
  ];

  for (const page of pages) {
    await db.page.upsert({
      where: { slug: page.slug },
      update: { title: page.title, seoTitle: page.seoTitle, seoDesc: page.seoDesc },
      create: page,
    });
  }
  console.log("✅ CMS pages (home, about, gift-certificate)");

  // ─── Site Settings ─────────────────────────────────────────────────────────
  await db.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      instagramUrl: "https://www.instagram.com/svetlana__masalova",
      whatsappUrl: "https://wa.me/996509237134",
      telegramUrl: "https://t.me/SvetLanaVen",
      heroImageUrl: "/images/hero.jpg",
    },
  });
  console.log("✅ SiteSettings");

  console.log("\n🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
