import { db } from "@/lib/db";
import { resolveLandingContent } from "@/lib/landing-content";
import { CourseCard } from "@/components/marketing/CourseCard";
import { ReviewsSection } from "@/components/marketing/ReviewsSection";
import { Metadata } from "next";
import { connection } from "next/server";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Send, AtSign, Gift, Award, Heart, Users } from "lucide-react";

export const dynamic = "force-dynamic";

const STAT_ICONS = [Award, Users, Heart, Gift];

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const settings = await db.siteSettings.findUnique({ where: { id: 1 } });
  const page = await db.page.findUnique({ where: { slug: "home" } });

  return {
    title: page?.seoTitle ?? "Онлайн-курсы детского массажа | Светлана Масалова",
    description:
      page?.seoDesc ??
      "Онлайн-курсы детского массажа от реабилитолога Светланой Масаловой. Специализация: РАС, ЗПРР, СДВГ. Доступ через GetCourse.",
    openGraph: {
      title: page?.seoTitle ?? "Онлайн-курсы детского массажа",
      description: page?.seoDesc ?? "Специалист по детскому массажу с опытом 10+ лет",
      images: settings?.heroImageUrl ? [{ url: settings.heroImageUrl }] : [],
    },
  };
}

export default async function HomePage() {
  await connection();
  const [products, settings] = await Promise.all([
    db.product.findMany({
      where: { isPublished: true },
      orderBy: { order: "asc" },
      include: {
        tariffs: {
          orderBy: { order: "asc" },
          select: { priceKgs: true, priceUsd: true },
        },
      },
    }),
    db.siteSettings.findUnique({ where: { id: 1 } }),
  ]);

  const lc = resolveLandingContent(settings?.landingContent);

  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-violet-50 via-white to-indigo-50 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-3 py-1.5 rounded-full">
                <Heart className="h-4 w-4" />
                {lc.hero.badge}
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground leading-tight">
                {lc.hero.titleLine1}
                <span className="text-primary"> {lc.hero.titleHighlight}</span>
                <br />{lc.hero.titleLine2}
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {lc.hero.description}
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/#courses"
                  className="inline-flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
                >
                  {lc.hero.ctaButton}
                </Link>
                {settings?.whatsappUrl && (
                  <a
                    href={settings.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-white text-foreground border border-border px-6 py-3 rounded-xl font-semibold hover:border-primary/50 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4 text-green-500" />
                    {lc.hero.whatsappButton}
                  </a>
                )}
              </div>

              {/* Social icons row */}
              <div className="flex items-center gap-3 pt-2">
                {settings?.telegramUrl && (
                  <a
                    href={settings.telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Send className="h-4 w-4" />
                    Telegram
                  </a>
                )}
                {settings?.instagramUrl && (
                  <a
                    href={settings.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <AtSign className="h-4 w-4" />
                    Instagram
                  </a>
                )}
              </div>
            </div>

            {/* Hero image */}
            <div className="relative flex items-center justify-center">
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src={settings?.heroImageUrl ?? "/images/hero.jpg"}
                  alt="Светлана Масалова — реабилитолог, массажист"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover object-right-top"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats ─────────────────────────────────────────────────────────────── */}
      <section className="bg-primary text-white py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {lc.stats.map((stat, i) => {
              const Icon = STAT_ICONS[i];
              return (
                <div key={i} className="space-y-1">
                  <Icon className="h-6 w-6 mx-auto opacity-80" />
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-sm text-white/70">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Courses ────────────────────────────────────────────────────────────── */}
      <section id="courses" className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">{lc.courses.title}</h2>
            <p className="text-muted-foreground mt-3 text-lg">{lc.courses.subtitle}</p>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">Курсы скоро появятся</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <CourseCard
                  key={product.id}
                  slug={product.slug}
                  title={product.title}
                  shortDescription={product.shortDescription}
                  thumbnailUrl={product.thumbnailUrl}
                  durationLabel={product.durationLabel}
                  priceKgs={product.priceKgs}
                  priceUsd={product.priceUsd}
                  tariffs={product.tariffs}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <ReviewsSection
        title={lc.reviews.title}
        subtitle={lc.reviews.subtitle}
        items={lc.reviews.items}
      />

      {/* ─── About teaser ──────────────────────────────────────────────────────── */}
      <section className="bg-muted/30 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-5">
              <h2 className="text-3xl font-bold text-foreground">{lc.about.title}</h2>
              <div className="space-y-3 text-muted-foreground leading-relaxed">
                {lc.about.bio.split("\n\n").map((para, i) => (
                  <p key={i} dangerouslySetInnerHTML={{ __html: para }} />
                ))}
              </div>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
              >
                {lc.about.linkText}
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {lc.about.cards.map((card, i) => (
                <div key={i} className="bg-white rounded-xl p-4 border border-border shadow-sm">
                  <div className="font-bold text-primary">{card.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{card.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Gift Certificate CTA ───────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-8 sm:p-12 text-white text-center">
            <Gift className="h-12 w-12 mx-auto mb-4 opacity-90" />
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">{lc.gift.title}</h2>
            <p className="text-white/80 text-lg mb-6 max-w-xl mx-auto">{lc.gift.subtitle}</p>
            <Link
              href="/gift-certificate"
              className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-xl font-semibold hover:bg-white/90 transition-colors"
            >
              <Gift className="h-4 w-4" />
              {lc.gift.button}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
