import { db } from "@/lib/db";
import { Metadata } from "next";
import { connection } from "next/server";
import { legalEntity } from "@/lib/legal";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const page = await db.page.findUnique({ where: { slug: "privacy" } });
  return {
    title: page?.seoTitle ?? "Политика конфиденциальности | " + legalEntity.brand,
    description:
      page?.seoDesc ??
      "Политика конфиденциальности и обработки персональных данных согласно законодательству Кыргызской Республики.",
  };
}

export default async function PrivacyPage() {
  await connection();
  const page = await db.page.findUnique({ where: { slug: "privacy" } });

  return (
    <div>
      <section className="bg-gradient-to-br from-violet-50 to-white py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">
            {page?.title ?? "Политика конфиденциальности"}
          </h1>
          <p className="mt-3 text-muted-foreground">
            Действует в соответствии с законодательством Кыргызской Республики
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
            <div className="prose max-w-none space-y-8 text-foreground">
              <section>
                <h2>1. Общие положения</h2>
                <p>
                  Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок
                  сбора, хранения, использования и передачи персональных данных пользователей
                  сайта <strong>{legalEntity.siteUrl}</strong>, принадлежащего{" "}
                  <strong>ИП {legalEntity.name}</strong> (ИНН {legalEntity.inn}).
                </p>
                <p>
                  Настоящая Политика разработана в соответствии с Законом Кыргызской Республики
                  «Об информации персонального характера» № 58 от 14 апреля 2008 года и иными
                  нормативными правовыми актами КР.
                </p>
                <p>
                  Используя сайт и оформляя заказы, вы подтверждаете своё согласие с условиями
                  настоящей Политики.
                </p>
              </section>

              <section>
                <h2>2. Сбор персональных данных</h2>
                <p>Мы собираем следующие данные:</p>
                <ul>
                  <li>Имя и фамилия</li>
                  <li>Адрес электронной почты</li>
                  <li>Номер телефона</li>
                  <li>Данные об оплате (обрабатываются платёжными провайдерами: Freedom Pay, Stripe)</li>
                  <li>Технические данные: IP-адрес, тип браузера, данные cookie</li>
                </ul>
                <p>Данные собираются при регистрации, оформлении заказа или обращении в поддержку.</p>
              </section>

              <section>
                <h2>3. Цели обработки персональных данных</h2>
                <p>Персональные данные используются в следующих целях:</p>
                <ul>
                  <li>Обработка и исполнение заказов, выдача доступа к онлайн-курсам</li>
                  <li>Отправка уведомлений об оплате и подтверждений по email</li>
                  <li>Технической поддержки пользователей</li>
                  <li>Улучшения качества сервиса и персонализации предложений</li>
                  <li>Выполнения требований законодательства КР</li>
                </ul>
              </section>

              <section>
                <h2>4. Передача данных третьим лицам</h2>
                <p>
                  Мы не продаём и не раскрываем ваши персональные данные третьим лицам, за
                  исключением:
                </p>
                <ul>
                  <li>
                    <strong>Платёжные провайдеры</strong> (Freedom Pay Kyrgyzstan, Stripe) — для
                    проведения оплаты
                  </li>
                  <li>
                    <strong>GetCourse</strong> — для предоставления доступа к учебным материалам
                  </li>
                  <li>
                    <strong>Государственные органы КР</strong> — по законному требованию
                  </li>
                </ul>
              </section>

              <section>
                <h2>5. Хранение данных</h2>
                <p>
                  Персональные данные хранятся в течение срока, необходимого для исполнения
                  договора и выполнения требований законодательства (не менее 5 лет с момента
                  последней операции). По истечении срока данные удаляются или обезличиваются.
                </p>
              </section>

              <section>
                <h2>6. Файлы cookie</h2>
                <p>
                  Сайт использует файлы cookie для корректной работы и аналитики (Яндекс.Метрика,
                  Google Analytics, Meta Pixel). Вы можете отключить cookie в настройках
                  браузера, однако это может повлиять на работу некоторых функций сайта.
                </p>
              </section>

              <section>
                <h2>7. Права пользователя</h2>
                <p>В соответствии с законодательством КР вы вправе:</p>
                <ul>
                  <li>Получить информацию о ваших персональных данных</li>
                  <li>Требовать исправления неточных данных</li>
                  <li>Требовать удаления данных (за исключением случаев, предусмотренных законом)</li>
                  <li>Отозвать согласие на обработку персональных данных</li>
                </ul>
                <p>
                  Для реализации прав обратитесь по телефону{" "}
                  <a href={`tel:${legalEntity.legalPhone.replace(/\s/g, "")}`}>
                    {legalEntity.legalPhone}
                  </a>
                  .
                </p>
              </section>

              <section>
                <h2>8. Защита данных</h2>
                <p>
                  Мы применяем технические и организационные меры для защиты персональных данных:
                  шифрование HTTPS, ограниченный доступ сотрудников, хранение на защищённых
                  серверах.
                </p>
              </section>

              <section>
                <h2>9. Изменение Политики</h2>
                <p>
                  Мы оставляем за собой право вносить изменения в настоящую Политику. Актуальная
                  версия всегда доступна по адресу{" "}
                  <strong>{legalEntity.siteUrl}/privacy</strong>. Продолжение использования сайта
                  после изменений означает согласие с новой редакцией.
                </p>
              </section>

              <section>
                <h2>10. Реквизиты оператора данных</h2>
                <p>
                  <strong>ИП {legalEntity.name}</strong>
                  <br />
                  ИНН: {legalEntity.inn}
                  <br />
                  Адрес: {legalEntity.address}
                  <br />
                  Телефон:{" "}
                  <a href={`tel:${legalEntity.legalPhone.replace(/\s/g, "")}`}>
                    {legalEntity.legalPhone}
                  </a>
                </p>
              </section>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
