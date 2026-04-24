import { Metadata } from "next";
import { legalEntity } from "@/lib/legal";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Реквизиты | " + legalEntity.brand,
  description:
    "Реквизиты ИП Чистяковой Азизы Эрлисовны — адрес, ИНН, ОКПО, телефон.",
};

export default function RequisitesPage() {
  return (
    <div>
      <section className="bg-gradient-to-br from-violet-50 to-white py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">
            Реквизиты
          </h1>
          <p className="mt-3 text-muted-foreground">
            Информация об индивидуальном предпринимателе
          </p>
        </div>
      </section>

      <section className="py-10 sm:py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-foreground">Сведения об организации</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {[
                { label: "Организационно-правовая форма", value: legalEntity.form },
                { label: "ФИО", value: legalEntity.name },
                { label: "ИНН", value: legalEntity.inn },
                { label: "ОКПО", value: legalEntity.okpo },
                { label: "Регистрационный номер", value: legalEntity.regNumber },
                { label: "Дата регистрации", value: legalEntity.regDate },
                { label: "Вид деятельности", value: legalEntity.activity },
                {
                  label: "Регистрирующий орган",
                  value: legalEntity.regAuthority,
                },
              ].map(({ label, value }) => (
                <div key={label} className="space-y-1">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-foreground">Контактная информация</h2>
            <dl className="space-y-3 text-sm">
              <div className="space-y-1">
                <dt className="text-muted-foreground">Юридический адрес</dt>
                <dd className="font-medium text-foreground">{legalEntity.address}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-muted-foreground">Телефон (по вопросам оплаты и возврата)</dt>
                <dd>
                  <a
                    href={`tel:${legalEntity.legalPhone.replace(/\s/g, "")}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {legalEntity.legalPhone}
                  </a>
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-muted-foreground">Телефон (для клиентов)</dt>
                <dd>
                  <a
                    href={`tel:${legalEntity.publicPhone.replace(/\s/g, "")}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {legalEntity.publicPhone}
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-muted/30 rounded-2xl p-6 sm:p-8 space-y-3 text-sm">
            <h2 className="text-lg font-bold text-foreground">Документы</h2>
            <nav className="flex flex-col gap-2">
              <Link href="/offer" className="text-primary hover:underline">
                Публичная оферта
              </Link>
              <Link href="/privacy" className="text-primary hover:underline">
                Политика конфиденциальности
              </Link>
              <Link href="/refund" className="text-primary hover:underline">
                Правила возврата денежных средств
              </Link>
            </nav>
          </div>
        </div>
      </section>
    </div>
  );
}
