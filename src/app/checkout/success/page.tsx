import Link from "next/link";
import { connection } from "next/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PendingOrderRefresh } from "@/components/checkout/PendingOrderRefresh";
import {
  formatMoney,
  orderStatusLabels,
  orderStatusVariants,
  purchaseTypeLabels,
  syncStatusLabels,
  syncStatusVariants,
} from "@/lib/order-meta";

export const dynamic = "force-dynamic";

interface SuccessPageProps {
  searchParams: Promise<{
    order?: string;
  }>;
}

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  await connection();

  const params = await searchParams;
  const orderId = params.order;
  const order = orderId
    ? await (await import("@/lib/db")).db.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  slug: true,
                  title: true,
                },
              },
              tariff: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      })
    : null;

  const primaryItem = order?.items[0];

  return (
    <div className="py-16 sm:py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              {order && (
                <>
                  <Badge variant={orderStatusVariants[order.status] ?? "secondary"}>
                    {orderStatusLabels[order.status] ?? order.status}
                  </Badge>
                  <Badge variant={syncStatusVariants[order.syncStatus] ?? "secondary"}>
                    {syncStatusLabels[order.syncStatus] ?? order.syncStatus}
                  </Badge>
                </>
              )}
            </div>
            <CardTitle className="text-3xl">
              {order?.status === "PAID"
                ? "Оплата подтверждена"
                : order?.status === "PENDING"
                ? "Платёж обрабатывается"
                : "Статус платежа обновляется"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {!order && (
              <p className="text-muted-foreground">
                Мы получили возврат со страницы оплаты. Если оплата уже прошла, обновите страницу через несколько секунд.
              </p>
            )}

            {order && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border p-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Заказ</div>
                    <div className="font-medium">{order.id}</div>
                    <div className="text-muted-foreground mt-1">{purchaseTypeLabels[order.purchaseType]}</div>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">К оплате</div>
                    <div className="font-medium">{formatMoney(order.amount, order.currency)}</div>
                    {order.paidCurrency && (
                      <div className="text-muted-foreground mt-1">Подтверждено в {order.paidCurrency}</div>
                    )}
                  </div>
                </div>

                {primaryItem && (
                  <div className="rounded-lg border border-border p-4 space-y-1">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Продукт</div>
                    <div className="font-medium">
                      {primaryItem.tariff
                        ? `${primaryItem.product.title} — ${primaryItem.tariff.name}`
                        : primaryItem.product.title}
                    </div>
                  </div>
                )}

                {order.status === "PAID" && order.purchaseType === "COURSE" && (
                  <p className="text-muted-foreground">
                    Письмо с подтверждением отправлено на <strong>{order.customerEmail}</strong>. Доступ к курсу
                    синхронизируется через GetCourse.
                  </p>
                )}

                {order.status === "PAID" && order.purchaseType === "GIFT_CERTIFICATE" && (
                  <p className="text-muted-foreground">
                    Сертификат выпущен. Код будет отправлен покупателю и, при указании, получателю подарка.
                  </p>
                )}

                {order.status === "PENDING" && (
                  <div className="space-y-3">
                    <p className="text-muted-foreground">
                      Stripe уже вернул вас на сайт, но итоговый статус ещё ждёт webhook-подтверждения. Обычно это
                      занимает несколько секунд.
                    </p>
                    <PendingOrderRefresh />
                  </div>
                )}

                {order.status === "FAILED" && (
                  <p className="text-destructive">
                    Платёж не был подтверждён. Можно вернуться к оформлению заказа и попробовать снова.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/">На главную</Link>
          </Button>
          {primaryItem && (
            <Button asChild variant="outline">
              <Link href={`/courses/${primaryItem.product.slug}`}>Вернуться к курсу</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
