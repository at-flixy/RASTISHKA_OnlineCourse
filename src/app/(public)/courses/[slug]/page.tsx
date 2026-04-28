import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { TariffCard } from "@/components/marketing/TariffCard";
import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Clock, ArrowLeft, CheckCircle } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug, isPublished: true },
  });

  if (!product) return { title: "Не найдено" };

  return {
    title: `${product.title} | Светлана Масалова`,
    description: product.shortDescription,
    openGraph: {
      title: product.title,
      description: product.shortDescription,
      images: product.thumbnailUrl ? [{ url: product.thumbnailUrl }] : [],
    },
  };
}

export default async function CoursePage({ params }: Props) {
  await connection();
  const { slug } = await params;

  const product = await db.product.findUnique({
    where: { slug, isPublished: true },
    include: { tariffs: { orderBy: { order: "asc" } } },
  });

  if (!product) notFound();

  const hasTariffs = product.tariffs.length > 0;

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-violet-50 to-white border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <Link
            href="/#courses"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Все курсы
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-5">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight">
                {product.title}
              </h1>
              <p className="text-lg text-muted-foreground">{product.shortDescription}</p>

              <div className="flex flex-wrap gap-3">
                {product.durationLabel && (
                  <span className="inline-flex items-center gap-1.5 text-sm bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">
                    <Clock className="h-3.5 w-3.5" />
                    Доступ {product.durationLabel}
                  </span>
                )}
                {!hasTariffs && product.priceKgs && (
                  <span className="inline-flex items-center text-sm bg-green-50 text-green-700 px-3 py-1.5 rounded-full font-bold">
                    {product.priceKgs.toLocaleString("ru-RU")} с
                    {product.priceUsd && <span className="ml-1 font-normal opacity-70">/ ${product.priceUsd}</span>}
                  </span>
                )}
              </div>
            </div>

            {product.thumbnailUrl && (
              <div className="relative h-64 lg:h-80 rounded-2xl overflow-hidden shadow-lg">
                <Image
                  src={product.thumbnailUrl}
                  alt={product.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Description */}
      {product.longDescription && (
        <section className="py-12 sm:py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: product.longDescription }}
            />
          </div>
        </section>
      )}

      {/* Tariffs */}
      {hasTariffs && (
        <section className="py-12 sm:py-16 bg-muted/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Выберите тариф</h2>
              <p className="text-muted-foreground mt-2">
                Все тарифы дают доступ к курсу в GetCourse
              </p>
            </div>

            <div
              className={`grid gap-6 ${
                product.tariffs.length === 3
                  ? "grid-cols-1 md:grid-cols-3"
                  : product.tariffs.length === 2
                  ? "grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto"
                  : "grid-cols-1 max-w-sm mx-auto"
              }`}
            >
              {product.tariffs.map((tariff, index) => (
                <TariffCard
                  key={tariff.id}
                  id={tariff.id}
                  productSlug={product.slug}
                  name={tariff.name}
                  tagline={tariff.tagline}
                  priceKgs={tariff.priceKgs}
                  priceUsd={tariff.priceUsd}
                  durationLabel={tariff.durationLabel}
                  includes={tariff.includes}
                  isFeatured={index === 1 && product.tariffs.length === 3}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Single product CTA */}
      {!hasTariffs && product.priceKgs && (() => {
        const ctaTitle = product.ctaTitle?.trim() || "Готовы начать?";
        const ctaSubtitle =
          product.ctaSubtitle?.trim() ||
          "Доступ открывается сразу после оплаты через GetCourse";
        const ctaFeatures =
          product.ctaFeatures && product.ctaFeatures.length > 0
            ? product.ctaFeatures
            : [
                "Видеоуроки в удобном формате",
                "Доступ на " + (product.durationLabel ?? "3 месяца"),
                "Методические материалы",
                "Поддержка куратора",
              ];
        const ctaButtonLabel =
          product.ctaButtonLabel?.trim() ||
          `Записаться за ${product.priceKgs.toLocaleString("ru-RU")} с`;

        return (
          <section className="py-12 bg-muted/30">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">{ctaTitle}</h2>
              <p className="text-muted-foreground mb-6">{ctaSubtitle}</p>
              <div className="bg-white rounded-2xl border border-border p-6 mb-6 text-left space-y-3">
                {ctaFeatures.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <Link
                href={`/checkout?product=${product.slug}`}
                className="inline-flex items-center justify-center gap-2 bg-primary text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-primary/90 transition-colors"
              >
                {ctaButtonLabel}
              </Link>
            </div>
          </section>
        );
      })()}
    </div>
  );
}
