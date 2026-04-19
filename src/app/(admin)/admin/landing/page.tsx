import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { LandingContentForm } from "@/components/admin/LandingContentForm";

export default async function LandingAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const settings = await db.siteSettings.findUnique({ where: { id: 1 } });
  const landingContent = (settings?.landingContent ?? null) as unknown as Parameters<
    typeof LandingContentForm
  >[0]["initialData"];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Редактор главной страницы</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Тексты всех блоков лендинга. Изменения видны сразу после сохранения.
        </p>
      </div>

      <LandingContentForm initialData={landingContent} />
    </div>
  );
}
