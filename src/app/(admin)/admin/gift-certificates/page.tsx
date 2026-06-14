import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { GiftCertificatesManager } from "@/components/admin/GiftCertificatesManager";

export const dynamic = "force-dynamic";

export default async function GiftCertificatesPage() {
  await requireAdmin();

  const [certificates, products] = await Promise.all([
    db.giftCertificate.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        order: { select: { id: true } },
        product: { select: { id: true, slug: true, title: true } },
        redeemedOrder: { select: { id: true } },
        tariff: { select: { id: true, name: true } },
      },
    }),
    db.product.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        priceKgs: true,
        priceUsd: true,
        title: true,
        tariffs: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            name: true,
            priceKgs: true,
            priceUsd: true,
          },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Подарочные сертификаты</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Выпуск, отправка, аннулирование и контроль погашения сертификатов.
        </p>
      </div>

      <GiftCertificatesManager
        products={products}
        initialCertificates={certificates.map((certificate) => ({
          ...certificate,
          createdAt: certificate.createdAt.toISOString(),
          redeemedAt: certificate.redeemedAt?.toISOString() ?? null,
          voidedAt: certificate.voidedAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
