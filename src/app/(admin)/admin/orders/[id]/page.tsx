import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  formatMoney,
  orderStatusLabels,
  orderStatusVariants,
  purchaseTypeLabels,
  syncStatusLabels,
  syncStatusVariants,
} from "@/lib/order-meta";
import { getPaymentProviderLabel } from "@/lib/payments/provider-meta";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OrderDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            select: {
              title: true,
              slug: true,
            },
          },
          tariff: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const logs = await db.integrationLog.findMany({
    where: { orderId: order.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const providerLabel = getPaymentProviderLabel(order.provider);

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={orderStatusVariants[order.status] ?? "secondary"}>
            {orderStatusLabels[order.status] ?? order.status}
          </Badge>
          <Badge variant={syncStatusVariants[order.syncStatus] ?? "secondary"}>
            {syncStatusLabels[order.syncStatus] ?? order.syncStatus}
          </Badge>
          <Badge variant="outline">{purchaseTypeLabels[order.purchaseType] ?? order.purchaseType}</Badge>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Заказ {order.id}</h1>
        <p className="text-sm text-muted-foreground">Подробности платежа, синхронизации и интеграционных логов</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Покупатель</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Имя:</span> {order.customerName}
            </div>
            <div>
              <span className="text-muted-foreground">Email:</span> {order.customerEmail}
            </div>
            <div>
              <span className="text-muted-foreground">Телефон:</span> {order.customerPhone ?? "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Получатель подарка:</span> {order.giftRecipientEmail ?? "—"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Платёж</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Сумма:</span> {formatMoney(order.amount, order.currency)}
            </div>
            <div>
              <span className="text-muted-foreground">Подтверждённая валюта:</span> {order.paidCurrency ?? "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Провайдер:</span> {providerLabel}
            </div>
            <div>
              <span className="text-muted-foreground">Payment ID провайдера:</span> {order.providerOrderId ?? "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Stripe session:</span> {order.stripeCheckoutSessionId ?? "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Stripe payment intent:</span>{" "}
              {order.stripePaymentIntentId ?? "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Оплачен:</span> {order.paidAt?.toLocaleString("ru-RU") ?? "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Состав заказа</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="rounded-lg border border-border p-4 text-sm">
              <div className="font-medium">
                {item.tariff ? `${item.product.title} — ${item.tariff.name}` : item.product.title}
              </div>
              <div className="text-muted-foreground mt-1">
                Каталожные цены: {formatMoney(item.priceKgs, "KGS")} / {formatMoney(item.priceUsd, "USD")}
              </div>
              <div className="text-muted-foreground mt-1">Slug: {item.product.slug}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Интеграционные логи</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Логов пока нет</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="rounded-lg border border-border p-4 space-y-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      log.status === "SUCCESS"
                        ? "success"
                        : log.status === "FAILED"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {log.status}
                  </Badge>
                  <span className="font-medium">{log.source}</span>
                  <span className="text-muted-foreground">{log.event}</span>
                  <span className="text-xs text-muted-foreground">{log.createdAt.toLocaleString("ru-RU")}</span>
                </div>
                {log.error && <p className="text-destructive">{log.error}</p>}
                {log.responseBody && (
                  <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
                    {log.responseBody}
                  </pre>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
