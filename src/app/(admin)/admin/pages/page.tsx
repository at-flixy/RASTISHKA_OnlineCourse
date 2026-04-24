import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { PageEditorForm } from "@/components/admin/PageEditorForm";
import { FileText } from "lucide-react";

const PAGE_SLUGS = [
  { slug: "home", label: "Главная страница", description: "Хиро-блок, контент лендинга" },
  { slug: "about", label: "Обо мне", description: "Страница /about" },
  { slug: "gift-certificate", label: "Подарочный сертификат", description: "Страница /gift-certificate" },
  { slug: "privacy", label: "Политика конфиденциальности", description: "Страница /privacy" },
  { slug: "offer", label: "Публичная оферта", description: "Страница /offer" },
  { slug: "refund", label: "Правила возврата", description: "Страница /refund" },
];

export default async function PagesAdminPage() {
  await requireAdmin();

  const pages = await db.page.findMany({
    where: { slug: { in: PAGE_SLUGS.map((p) => p.slug) } },
  });

  const pageMap = Object.fromEntries(pages.map((p) => [p.slug, p]));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Страницы</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Редактирование контента публичных страниц
        </p>
      </div>

      <div className="space-y-8">
        {PAGE_SLUGS.map(({ slug, label, description }) => {
          const page = pageMap[slug];

          return (
            <div key={slug} className="space-y-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h2 className="text-lg font-semibold">{label}</h2>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                {page ? (
                  <Badge variant="success" className="ml-auto">Есть данные</Badge>
                ) : (
                  <Badge variant="secondary" className="ml-auto">Не заполнена</Badge>
                )}
              </div>

              <PageEditorForm
                slug={slug}
                initialData={{
                  title: page?.title ?? label,
                  content: page?.content ?? "",
                  seoTitle: page?.seoTitle,
                  seoDesc: page?.seoDesc,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
