import { db } from "@/lib/db";
import { Metadata } from "next";
import { connection } from "next/server";
import Image from "next/image";
import Link from "next/link";
import { Award, Heart, BookOpen, Users, GraduationCap, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const page = await db.page.findUnique({ where: { slug: "about" } });
  return {
    title: page?.seoTitle ?? "Обо мне | Светлана Масалова",
    description:
      page?.seoDesc ??
      "Светлана Масалова — реабилитолог, специалист по детскому массажу. Работает с детьми с аутизм, РАС, ЗПРР, ЗПР, СДВГ, ДЦП.",
  };
}

export default async function AboutPage() {
  await connection();
  const [page, settings] = await Promise.all([
    db.page.findUnique({ where: { slug: "about" } }),
    db.siteSettings.findUnique({ where: { id: 1 } }),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-violet-50 to-white py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground">
                {page?.title ?? "Обо мне"}
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Реабилитолог и специалист по детскому массажу с опытом более 10 лет.
                Работаю с особенными детьми — РАС, ЗПРР, СДВГ, ДЦП.
              </p>
              <div className="flex flex-wrap gap-3">
                {[
                  { icon: Award, label: "Реабилитолог" },
                  { icon: Heart, label: "10+ лет опыта" },
                  { icon: Users, label: "500+ учеников" },
                  { icon: BookOpen, label: "6 онлайн-курсов" },
                ].map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-2 bg-white border border-border text-sm px-3 py-1.5 rounded-full text-foreground shadow-sm"
                  >
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src={settings?.heroImageUrl ?? "/images/hero.jpg"}
                alt="Светлана Масалова — реабилитолог, массажист"
                fill
                className="object-cover object-right-top"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Content from CMS */}
      {page?.content && (
        <section className="py-12 sm:py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          </div>
        </section>
      )}

      {/* Static content if no CMS */}
      {!page?.content && (
        <section className="py-12 sm:py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-10">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">Моя история</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Меня зовут Светлана Масалова. Я живу и работаю в Бишкеке, Кыргызстан.
                  Более 10 лет я занимаюсь реабилитацией детей и помогаю родителям понять,
                  как через тело и нервную систему влиять на состояние ребёнка.
                </p>
                <p>
                  Специализируюсь на работе с особенными детьми: РАС (расстройство
                  аутистического спектра), ЗПРР (задержка психо-речевого развития),
                  СДВГ, ДЦП и другие неврологические нарушения.
                </p>
                <p>
                  Я создала онлайн-курсы, потому что вижу: огромное количество родителей
                  не имеют доступа к грамотному специалисту рядом. Через курсы я передаю
                  именно систему — не набор техник, а понимание, что происходит в организме
                  ребёнка и как помочь.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                {
                  title: "Образование",
                  items: [
                    "Медицинское образование",
                    "Специализация «Реабилитация»",
                    "Курсы по неврологии и педиатрии",
                  ],
                },
                {
                  title: "Опыт работы",
                  items: [
                    "Частная практика 10+ лет",
                    "Работа в реабилитационных центрах",
                    "Онлайн-обучение с 2019 года",
                  ],
                },
                {
                  title: "Специализация",
                  items: [
                    "РАС, ЗПРР, СДВГ",
                    "Грудничковый массаж",
                    "Висцеральный массаж",
                  ],
                },
              ].map(({ title, items }) => (
                <div key={title} className="bg-white rounded-2xl border border-border p-5 shadow-sm">
                  <h3 className="font-bold text-foreground mb-3">{title}</h3>
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-1">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Credentials */}
      <section className="py-12 sm:py-16 bg-muted/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-8">
            <GraduationCap className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Образование и сертификаты</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                year: "2019",
                type: "Диплом бакалавра",
                title: "«Здоровье человека»",
                issuer:
                  "Мелитопольский институт экологии и социальных технологий / Открытый международный университет развития человека «Украина»",
                page: 1,
              },
              {
                year: "2016",
                type: "Сертификат",
                title: "«Массажист-реабилитолог»",
                issuer:
                  "Мелитопольский институт экологии и социальных технологий, 72 часа",
                page: 2,
              },
              {
                year: "2025",
                type: "Сертификат",
                title: "«Остеопатический подход к новорождённым»",
                issuer:
                  "Академия Асель Жагапаровны — Osteo Correction, Бишкек",
                page: 3,
              },
            ].map(({ year, type, title, issuer, page }) => (
              <div
                key={title}
                className="bg-white rounded-2xl border border-border p-5 shadow-sm flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    <Award className="h-3 w-3" />
                    {type}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">{year}</span>
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm leading-snug">{title}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{issuer}</p>
                </div>
                <a
                  href={`/documents/masalova-credentials.pdf#page=${page}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Смотреть документ
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Готовы начать обучение?</h2>
          <p className="text-muted-foreground">
            Выберите курс, который подходит для вашего ребёнка
          </p>
          <Link
            href="/#courses"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            Смотреть курсы
          </Link>
        </div>
      </section>
    </div>
  );
}
