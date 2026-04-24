import Link from "next/link";
import { requireCustomer } from "@/lib/authz";
import { linkOrdersToUserByEmail } from "@/lib/account";
import { db } from "@/lib/db";
import {
  formatMoney,
  orderStatusLabels,
  orderStatusVariants,
  purchaseTypeLabels,
  syncStatusLabels,
  syncStatusVariants,
} from "@/lib/order-meta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function AccountOrdersPage() {
  const session = await requireCustomer("/account/orders");

  if (session.user.email) {
    await linkOrdersToUserByEmail({ email: session.user.email, userId: session.user.id });
  }

  const orders = await db.order.findMany({
    where: { userId: session.user.id },
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
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">История заказов</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {orders.length === 0 ? (
          <div className="space-y-4 p-6 text-center">
            <p className="text-sm text-muted-foreground">Заказов пока нет.</p>
            <Button asChild>
              <Link href="/#courses">Выбрать курс</Link>
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Заказ</TableHead>
                <TableHead>Продукт</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Доступ</TableHead>
                <TableHead>Дата</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const primaryItem = order.items[0];
                const title = primaryItem
                  ? primaryItem.tariff
                    ? `${primaryItem.product.title} - ${primaryItem.tariff.name}`
                    : primaryItem.product.title
                  : "Заказ";

                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">{order.id}</TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{title}</div>
                      <div className="text-xs text-muted-foreground">
                        {purchaseTypeLabels[order.purchaseType] ?? order.purchaseType}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {formatMoney(order.amount, order.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={orderStatusVariants[order.status] ?? "secondary"}>
                        {orderStatusLabels[order.status] ?? order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={syncStatusVariants[order.syncStatus] ?? "secondary"}>
                        {syncStatusLabels[order.syncStatus] ?? order.syncStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {order.createdAt.toLocaleDateString("ru-RU")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
