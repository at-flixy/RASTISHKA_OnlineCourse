import { requireAdmin } from "@/lib/authz";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ProductForm } from "@/components/admin/ProductForm";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;
  const product = await db.product.findUnique({
    where: { id },
    include: { tariffs: { orderBy: { order: "asc" } } },
  });

  if (!product) notFound();

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/products">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Назад
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{product.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">/{product.slug}</p>
        </div>
      </div>

      <ProductForm product={product} />
    </div>
  );
}
