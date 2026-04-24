import Link from "next/link";
import { connection } from "next/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface CancelPageProps {
  searchParams: Promise<{
    order?: string;
  }>;
}

function buildRetryUrl(order: {
  currency: string;
  purchaseType: string;
  items: Array<{
    product: { slug: string };
    tariffId: string | null;
  }>;
}) {
  const primaryItem = order.items[0];

  if (!primaryItem) {
    return "/";
  }

  const params = new URLSearchParams({
    product: primaryItem.product.slug,
    currency: order.currency,
  });

  if (primaryItem.tariffId) {
    params.set("tariff", primaryItem.tariffId);
  }

  if (order.purchaseType === "GIFT_CERTIFICATE") {
    params.set("type", "gift");
  }

  return `/checkout?${params.toString()}`;
}

export default async function CheckoutCancelPage({ searchParams }: CancelPageProps) {
  await connection();

  const params = await searchParams;
  const orderId = params.order;
  const order = orderId
    ? await db.order.findUnique({
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
            },
          },
        },
      })
    : null;
  const primaryItem = order?.items[0];
  const retryUrl = order ? buildRetryUrl(order) : "/";

  return (
    <div className="py-16 sm:py-20">
      <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Оплата не завершена</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Вы закрыли страницу оплаты до завершения платежа. Заказ не был подтверждён, но вы
              можете вернуться к нему и попробовать снова.
            </p>
            {primaryItem && (
              <div className="space-y-1 rounded-lg border border-border bg-background p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Незавершённый заказ
                </div>
                <div className="font-medium text-foreground">{primaryItem.product.title}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href={retryUrl}>Вернуться к оплате</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">На главную</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
