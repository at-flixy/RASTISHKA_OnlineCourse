import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, BookOpen, TrendingUp } from "lucide-react";

export default async function AdminDashboardPage() {
  const session = await requireAdmin();

  const [totalOrders, paidOrders, totalProducts, recentOrders] = await Promise.all([
    db.order.count(),
    db.order.count({ where: { status: "PAID" } }),
    db.product.count({ where: { isPublished: true } }),
    db.order.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { items: { include: { product: true } } },
    }),
  ]);

  const revenueKgs = await db.order.aggregate({
    where: { status: "PAID", currency: "KGS" },
    _sum: { amount: true },
  });

  const statusLabels: Record<string, string> = {
    PENDING: "Ожидание",
    PAID: "Оплачен",
    FAILED: "Ошибка",
    REFUNDED: "Возврат",
  };

  const statusVariants: Record<string, "default" | "success" | "destructive" | "secondary" | "warning" | "outline"> = {
    PENDING: "warning",
    PAID: "success",
    FAILED: "destructive",
    REFUNDED: "secondary",
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Дашборд</h1>
        <p className="text-muted-foreground text-sm mt-1">Добро пожаловать, {session.user.name}!</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Заказов всего</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Оплаченных</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{paidOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Выручка (KGS)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((revenueKgs._sum.amount ?? 0) / 100).toLocaleString("ru-RU")} с
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Продуктов опубл.</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Последние заказы</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Заказов пока нет</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Покупатель</TableHead>
                  <TableHead>Продукт</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{order.customerName}</div>
                      <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {order.items[0]?.product.title ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {(order.amount / 100).toLocaleString("ru-RU")} {order.currency}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[order.status] ?? "secondary"}>
                        {statusLabels[order.status] ?? order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {order.createdAt.toLocaleDateString("ru-RU")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
