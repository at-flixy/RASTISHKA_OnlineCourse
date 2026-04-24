import Link from "next/link";
import { ExternalLink, GraduationCap, HelpCircle, ReceiptText } from "lucide-react";
import { requireCustomer } from "@/lib/authz";
import { linkOrdersToUserByEmail } from "@/lib/account";
import { db } from "@/lib/db";
import { getGetCourseApiHost } from "@/lib/getcourse";
import {
  formatMoney,
  syncStatusLabels,
  syncStatusVariants,
} from "@/lib/order-meta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

function getGetCourseUrl() {
  if (!process.env.GETCOURSE_ACCOUNT) {
    return null;
  }

  return `https://${getGetCourseApiHost(process.env.GETCOURSE_ACCOUNT)}`;
}

function getSupportUrl(settings: {
  telegramUrl: string | null;
  whatsappUrl: string | null;
}) {
  return settings.telegramUrl ?? settings.whatsappUrl ?? `mailto:${process.env.MAIL_FROM ?? ""}`;
}

export default async function AccountPage() {
  const session = await requireCustomer("/account");
  const email = session.user.email;

  if (email) {
    await linkOrdersToUserByEmail({ email, userId: session.user.id });
  }

  const [orders, settings] = await Promise.all([
    db.order.findMany({
      where: {
        userId: session.user.id,
        purchaseType: "COURSE",
        status: "PAID",
      },
      orderBy: { createdAt: "desc" },
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
                name: true,
              },
            },
          },
        },
      },
    }),
    db.siteSettings.findUnique({
      where: { id: 1 },
      select: {
        telegramUrl: true,
        whatsappUrl: true,
      },
    }),
  ]);

  const getCourseUrl = getGetCourseUrl();
  const supportUrl = getSupportUrl(settings ?? { telegramUrl: null, whatsappUrl: null });
  const courseItems = orders.flatMap((order) =>
    order.items.map((item) => ({
      id: item.id,
      order,
      title: item.tariff ? `${item.product.title} - ${item.tariff.name}` : item.product.title,
      slug: item.product.slug,
    }))
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Активные курсы</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courseItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Оплаченных заказов</CardTitle>
            <ReceiptText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Поддержка</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <a href={supportUrl}>Написать</a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Мои курсы</CardTitle>
        </CardHeader>
        <CardContent>
          {courseItems.length === 0 ? (
            <div className="space-y-4 rounded-lg border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">Оплаченных курсов пока нет.</p>
              <Button asChild>
                <Link href="/#courses">Выбрать курс</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {courseItems.map(({ id, order, slug, title }) => (
                <div
                  key={id}
                  className="grid gap-4 rounded-lg border border-border bg-background p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={syncStatusVariants[order.syncStatus] ?? "secondary"}>
                        {syncStatusLabels[order.syncStatus] ?? order.syncStatus}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatMoney(order.amount, order.currency)}
                      </span>
                    </div>
                    <div>
                      <h2 className="font-semibold text-foreground">{title}</h2>
                      <p className="text-sm text-muted-foreground">
                        Заказ от {order.createdAt.toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                    {order.syncStatus === "FAILED" && (
                      <p className="text-sm text-destructive">
                        Доступ не синхронизировался автоматически. Напишите в поддержку.
                      </p>
                    )}
                    {order.syncStatus === "PENDING" && (
                      <p className="text-sm text-muted-foreground">Доступ оформляется автоматически.</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <Button variant="outline" asChild>
                      <Link href={`/courses/${slug}`}>Страница курса</Link>
                    </Button>
                    {order.syncStatus === "SUCCESS" && getCourseUrl && (
                      <Button asChild>
                        <a href={getCourseUrl} target="_blank" rel="noopener noreferrer">
                          GetCourse
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {order.syncStatus === "FAILED" && (
                      <Button variant="secondary" asChild>
                        <a href={supportUrl}>Поддержка</a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
