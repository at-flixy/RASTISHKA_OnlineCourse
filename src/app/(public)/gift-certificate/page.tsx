import { db } from "@/lib/db";
import { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { Gift, Heart, Sparkles, CheckCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Подарочный сертификат | Светлана Масалова",
  description:
    "Подарите онлайн-курс по детскому массажу. Идеальный подарок для молодых родителей.",
};

export default async function GiftCertificatePage() {
  await connection();
  const page = await db.page.findUnique({ where: { slug: "gift-certificate" } });

  const products = await db.product.findMany({
    where: { isPublished: true },
    orderBy: { order: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      priceKgs: true,
      priceUsd: true,
      tariffs: {
        select: { priceKgs: true, priceUsd: true },
        orderBy: { order: "asc" },
        take: 1,
      },
    },
  });

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-violet-50 via-white to-pink-50 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
            <Gift className="h-4 w-4" />
            Подарочный сертификат
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground">
            {page?.title ?? "Подарите заботу о ребёнке"}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Подарочный сертификат на онлайн-курс по детскому массажу — лучший подарок
            для родителей, которые хотят помочь своему ребёнку.
          </p>
        </div>
      </section>

      {/* CMS Content */}
      {page?.content && (
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-10">
            Как это работает
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                icon: Gift,
                step: "1",
                title: "Выберите сумму",
                desc: "Укажите сумму сертификата или выберите конкретный курс",
              },
              {
                icon: Heart,
                step: "2",
                title: "Оплатите",
                desc: "Оплатите картой на защищённой странице Stripe Checkout",
              },
              {
                icon: Sparkles,
                step: "3",
                title: "Получите код",
                desc: "Вам придёт письмо с уникальным кодом сертификата для передачи получателю",
              },
            ].map(({ icon: Icon, step, title, desc }) => (
              <div
                key={step}
                className="flex flex-col items-center text-center p-6 bg-white rounded-2xl border border-border shadow-sm"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4 font-bold text-lg">
                  {step}
                </div>
                <Icon className="h-6 w-6 text-primary mb-3" />
                <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products to gift */}
      <section className="py-12 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">
            Выберите курс для сертификата
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => {
              const price = product.tariffs[0]?.priceKgs ?? product.priceKgs;
              const priceUsd = product.tariffs[0]?.priceUsd ?? product.priceUsd;
              return (
                <div
                  key={product.id}
                  className="bg-white rounded-xl border border-border p-4 space-y-3"
                >
                  <h3 className="font-semibold text-sm text-foreground">{product.title}</h3>
                  {price && (
                    <p className="text-primary font-bold">
                      от {price.toLocaleString("ru-RU")} с
                      {priceUsd && (
                        <span className="text-muted-foreground font-normal text-xs ml-1">
                          / ${priceUsd}
                        </span>
                      )}
                    </p>
                  )}
                  <Link
                    href={`/checkout?product=${product.slug}&type=gift`}
                    className="block w-full text-center text-sm bg-primary/10 text-primary px-3 py-2 rounded-lg font-medium hover:bg-primary/20 transition-colors"
                  >
                    Подарить этот курс
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">
            Почему это хороший подарок
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              "Практические знания, которые можно применить сразу",
              "Курс можно проходить в удобное время",
              "Доступ сохраняется на 3-12 месяцев",
              "Подходит для родителей из любого города",
              "Обратная связь и поддержка куратора",
              "Сертификат можно использовать частями",
            ].map((benefit) => (
              <div key={benefit} className="flex items-start gap-3 p-3">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <span className="text-sm text-foreground/80">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
