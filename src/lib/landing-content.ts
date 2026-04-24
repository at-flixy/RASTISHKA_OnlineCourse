import { z } from "zod";

const statSchema = z.object({
  value: z.string(),
  label: z.string(),
});

const aboutCardSchema = z.object({
  title: z.string(),
  desc: z.string(),
});

const reviewItemSchema = z.object({
  name: z.string(),
  source: z.string(),
  description: z.string(),
  alt: z.string(),
  imageUrl: z.string(),
});

export const landingContentSchema = z.object({
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
    cards: z.array(aboutCardSchema).length(4),
  }),
  reviews: z.object({
    title: z.string(),
    subtitle: z.string(),
    items: z.array(reviewItemSchema),
  }),
  gift: z.object({
    title: z.string(),
    subtitle: z.string(),
    button: z.string(),
  }),
});

export type LandingContent = z.infer<typeof landingContentSchema>;
export type LandingReviewItem = z.infer<typeof reviewItemSchema>;

const BASE_LANDING_CONTENT: LandingContent = {
  hero: {
    badge: "Детский массаж онлайн",
    titleLine1: "Массаж, который",
    titleHighlight: "меняет жизнь",
    titleLine2: "ребёнка",
    description:
      "Онлайн-курсы для родителей и специалистов от реабилитолога с опытом 10+ лет. Работаю с детьми с РАС, ЗПРР, СДВГ. Системный подход через тело и нервную систему.",
    ctaButton: "Смотреть курсы",
    whatsappButton: "Написать в WhatsApp",
  },
  stats: [
    { value: "10+", label: "лет опыта" },
    { value: "500+", label: "учеников" },
    { value: "6", label: "курсов" },
    { value: "100%", label: "онлайн" },
  ],
  courses: {
    title: "Курсы и материалы",
    subtitle: "Системные знания по детскому массажу — от базового до углублённого",
  },
  about: {
    title: "Кто ведёт курсы?",
    bio: "Светлана Масалова — реабилитолог, специалист по детскому массажу с опытом работы более 10 лет. Бишкек, Кыргызстан.\n\nСпециализируется на работе с особенными детьми: РАС, ЗПРР, СДВГ, ДЦП. Помогает родителям понять, как через массаж влиять на состояние нервной системы ребёнка.\n\nСоздала систему онлайн-курсов, чтобы дать знания семьям, где нет доступа к специалисту рядом.",
    linkText: "Подробнее обо мне →",
    cards: [
      { title: "Реабилитолог", desc: "Профессиональная подготовка и сертификаты" },
      { title: "Педагог", desc: "Умею объяснять сложное простыми словами" },
      { title: "10+ лет", desc: "Практического опыта с особенными детьми" },
      { title: "500+ учеников", desc: "Из России, Казахстана, Кыргызстана" },
    ],
  },
  reviews: {
    title: "Отзывы и истории учеников",
    subtitle: "Живые переписки, фотоотчёты и впечатления учеников после обучения и практики.",
    items: [],
  },
  gift: {
    title: "Подарите знания близким",
    subtitle:
      "Подарочный сертификат на любой курс — идеальный подарок для молодых родителей",
    button: "Оформить сертификат",
  },
};

export function createDefaultLandingContent(): LandingContent {
  return structuredClone(BASE_LANDING_CONTENT);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
}

function getText(
  source: Record<string, unknown>,
  key: string,
  fallback: string
): string {
  return typeof source[key] === "string" ? source[key] : fallback;
}

function normalizeStats(
  input: unknown,
  defaults: LandingContent["stats"]
): LandingContent["stats"] {
  if (!Array.isArray(input)) {
    return defaults;
  }

  return defaults.map((item, index) => {
    const source = asRecord(input[index]);
    return {
      value: getText(source, "value", item.value),
      label: getText(source, "label", item.label),
    };
  });
}

function normalizeAboutCards(
  input: unknown,
  defaults: LandingContent["about"]["cards"]
): LandingContent["about"]["cards"] {
  if (!Array.isArray(input)) {
    return defaults;
  }

  return defaults.map((item, index) => {
    const source = asRecord(input[index]);
    return {
      title: getText(source, "title", item.title),
      desc: getText(source, "desc", item.desc),
    };
  });
}

function normalizeReviewItems(input: unknown): LandingReviewItem[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.map((item, index) => {
    const source = asRecord(item);
    const fallbackName = `Отзыв ${index + 1}`;

    return {
      name: getText(source, "name", ""),
      source: getText(source, "source", ""),
      description: getText(source, "description", ""),
      alt: getText(source, "alt", getText(source, "name", fallbackName)),
      imageUrl: getText(source, "imageUrl", ""),
    };
  });
}

export function resolveLandingContent(input: unknown): LandingContent {
  const parsed = landingContentSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  const defaults = createDefaultLandingContent();
  const source = asRecord(input);
  const hero = asRecord(source.hero);
  const courses = asRecord(source.courses);
  const about = asRecord(source.about);
  const reviews = asRecord(source.reviews);
  const gift = asRecord(source.gift);

  return {
    hero: {
      badge: getText(hero, "badge", defaults.hero.badge),
      titleLine1: getText(hero, "titleLine1", defaults.hero.titleLine1),
      titleHighlight: getText(hero, "titleHighlight", defaults.hero.titleHighlight),
      titleLine2: getText(hero, "titleLine2", defaults.hero.titleLine2),
      description: getText(hero, "description", defaults.hero.description),
      ctaButton: getText(hero, "ctaButton", defaults.hero.ctaButton),
      whatsappButton: getText(hero, "whatsappButton", defaults.hero.whatsappButton),
    },
    stats: normalizeStats(source.stats, defaults.stats),
    courses: {
      title: getText(courses, "title", defaults.courses.title),
      subtitle: getText(courses, "subtitle", defaults.courses.subtitle),
    },
    about: {
      title: getText(about, "title", defaults.about.title),
      bio: getText(about, "bio", defaults.about.bio),
      linkText: getText(about, "linkText", defaults.about.linkText),
      cards: normalizeAboutCards(about.cards, defaults.about.cards),
    },
    reviews: {
      title: getText(reviews, "title", defaults.reviews.title),
      subtitle: getText(reviews, "subtitle", defaults.reviews.subtitle),
      items: normalizeReviewItems(reviews.items),
    },
    gift: {
      title: getText(gift, "title", defaults.gift.title),
      subtitle: getText(gift, "subtitle", defaults.gift.subtitle),
      button: getText(gift, "button", defaults.gift.button),
    },
  };
}
