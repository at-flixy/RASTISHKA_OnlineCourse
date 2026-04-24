import { db } from "@/lib/db";
import { Metadata } from "next";
import { connection } from "next/server";
import { legalEntity, refundPolicy } from "@/lib/legal";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const page = await db.page.findUnique({ where: { slug: "refund" } });
  return {
    title: page?.seoTitle ?? "Правила возврата | " + legalEntity.brand,
    description:
      page?.seoDesc ??
      "Правила возврата денежных средств за онлайн-курсы.",
  };
}

export default async function RefundPage() {
  await connection();
  const page = await db.page.findUnique({ where: { slug: "refund" } });

  return (
    <div>
      <section className="bg-gradient-to-br from-violet-50 to-white py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">
            {page?.title ?? "Правила возврата денежных средств"}
          </h1>
          <p className="mt-3 text-muted-foreground">
            Условия возврата оплаты за онлайн-курсы
          </p>
        </div>
      </section>

      <section className="py-10 sm:py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {page?.content ? (
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          ) : (
            <div className="prose max-w-none text-foreground">
              <section>
                <h2>1. Условия возврата</h2>
                <p>
                  Заказчик вправе запросить возврат денежных средств при одновременном
                  соблюдении обоих условий:
                </p>
                <ul>
                  <li>
                    С момента оплаты прошло не более{" "}
                    <strong>{refundPolicy.deadlineDays} календарных дней</strong>
                  </li>
                  <li>
                    Курс <strong>не начат</strong> — не просмотрен ни один урок
                  </li>
                </ul>
                <p>
                  Если оба условия выполнены, возврат осуществляется в полном объёме на тот
                  же платёжный инструмент, с которого была произведена оплата.
                </p>
              </section>

              <section>
                <h2>2. Когда возврат невозможен</h2>
                <p>Возврат не производится, если:</p>
                <ul>
                  <li>С момента оплаты прошло более {refundPolicy.deadlineDays} дней</li>
                  <li>Заказчик приступил к изучению курса — просмотрен хотя бы один урок</li>
                  <li>Курс был приобретён по акционной цене (со скидкой более 50%)</li>
                  <li>Доступ к курсу был передан третьим лицам</li>
                </ul>
              </section>

              <section>
                <h2>3. Как подать заявку на возврат</h2>
                <p>Для оформления возврата необходимо:</p>
                <ol>
                  <li>
                    Позвонить или написать на номер{" "}
                    <a href={`tel:${legalEntity.legalPhone.replace(/\s/g, "")}`}>
                      {legalEntity.legalPhone}
                    </a>
                  </li>
                  <li>
                    Сообщить email, использованный при покупке, и название курса
                  </li>
                  <li>
                    Указать причину возврата
                  </li>
                </ol>
                <p>
                  Заявка рассматривается в течение <strong>5 рабочих дней</strong>. При
                  одобрении средства возвращаются в течение <strong>7–14 рабочих дней</strong>{" "}
                  в зависимости от банка-эмитента.
                </p>
              </section>

              <section>
                <h2>4. Подарочные сертификаты</h2>
                <p>
                  Возврат средств за подарочный сертификат возможен до момента его активации,
                  при условии обращения в течение {refundPolicy.deadlineDays} дней с момента
                  покупки.
                </p>
                <p>
                  После активации сертификата и получения доступа к курсу применяются стандартные
                  условия возврата (пункты 1–3).
                </p>
              </section>

              <section>
                <h2>5. Технические проблемы</h2>
                <p>
                  Если доступ к курсу не был предоставлен в течение 24 часов после оплаты
                  по причинам, зависящим от Исполнителя, возврат осуществляется в полном
                  объёме вне зависимости от прошедшего времени.
                </p>
              </section>

              <section>
                <h2>6. Контакты для возврата</h2>
                <p>
                  <strong>ИП {legalEntity.name}</strong>
                  <br />
                  Телефон:{" "}
                  <a href={`tel:${legalEntity.legalPhone.replace(/\s/g, "")}`}>
                    {legalEntity.legalPhone}
                  </a>
                  <br />
                  Адрес: {legalEntity.address}
                </p>
              </section>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
