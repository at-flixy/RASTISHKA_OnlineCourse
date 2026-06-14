import Link from "next/link";
import { ManualAccessForm } from "@/components/admin/ManualAccessForm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { syncStatusLabels, syncStatusVariants } from "@/lib/order-meta";

export const dynamic = "force-dynamic";

export default async function ManualAccessPage() {
  await requireAdmin();

  const [products, recentManualOrders] = await Promise.all([
    db.product.findMany({
      orderBy: { order: "asc" },
      select: {
        getcourseGroupName: true,
        id: true,
        slug: true,
        title: true,
        tariffs: {
          orderBy: { order: "asc" },
          select: {
            durationLabel: true,
            getcourseGroupName: true,
            id: true,
            name: true,
          },
        },
      },
    }),
    db.order.findMany({
      where: { provider: "MANUAL" },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        items: {
          include: {
            product: { select: { title: true } },
            tariff: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ручные доступы</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Выдача доступа после ручной оплаты: сайт создаст оплаченный заказ и добавит ученика в группу GetCourse.
        </p>
      </div>

      <ManualAccessForm products={products} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Последние ручные выдачи</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentManualOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ручных выдач пока нет</p>
          ) : (
            recentManualOrders.map((order) => {
              const item = order.items[0];
              const title = item
                ? item.tariff
                  ? `${item.product.title} - ${item.tariff.name}`
                  : item.product.title
                : "Без курса";

              return (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary/40"
                >
                  <div>
                    <div className="font-medium text-sm">{order.customerEmail}</div>
                    <div className="text-xs text-muted-foreground">{title}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={syncStatusVariants[order.syncStatus] ?? "secondary"}>
                      {syncStatusLabels[order.syncStatus] ?? order.syncStatus}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {order.createdAt.toLocaleString("ru-RU")}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
