import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { PromoCodesManager } from "@/components/admin/PromoCodesManager";

export const dynamic = "force-dynamic";

export default async function PromoCodesPage() {
  await requireAdmin();

  const [promoCodes, products] = await Promise.all([
    db.promoCode.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { redemptions: true },
        },
        productScopes: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: {
            product: { order: "asc" },
          },
        },
      },
    }),
    db.product.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Промокоды</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Процентные скидки для выбранных курсов.
        </p>
      </div>

      <PromoCodesManager
        products={products}
        initialPromoCodes={promoCodes.map((promoCode) => ({
          _count: promoCode._count,
          appliesToAllProducts: promoCode.appliesToAllProducts,
          code: promoCode.code,
          createdAt: promoCode.createdAt.toISOString(),
          description: promoCode.description,
          endsAt: promoCode.endsAt?.toISOString() ?? null,
          id: promoCode.id,
          isActive: promoCode.isActive,
          maxRedemptions: promoCode.maxRedemptions,
          perCustomerLimit: promoCode.perCustomerLimit,
          percentOff: promoCode.percentOff,
          productScopes: promoCode.productScopes.map((scope) => ({
            product: scope.product,
            productId: scope.productId,
          })),
          startsAt: promoCode.startsAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
