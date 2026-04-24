import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductsTable } from "@/components/admin/ProductsTable";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function ProductsPage() {
  await requireAdmin();

  const products = await db.product.findMany({
    orderBy: { order: "asc" },
    include: {
      tariffs: { orderBy: { order: "asc" }, select: { id: true, name: true, priceKgs: true } },
      _count: { select: { orderItems: true } },
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Продукты</h1>
          <p className="text-muted-foreground text-sm mt-1">Управление курсами и продуктами</p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="h-4 w-4 mr-2" />
            Добавить продукт
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Все продукты ({products.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ProductsTable initialProducts={products} />
        </CardContent>
      </Card>
    </div>
  );
}
