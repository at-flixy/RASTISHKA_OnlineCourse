import { requireAdmin } from "@/lib/authz";
import { getSiteSettings } from "@/lib/site-settings";
import { SettingsForm } from "@/components/admin/SettingsForm";

export default async function SettingsPage() {
  await requireAdmin();

  const settings = await getSiteSettings();

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Настройки</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Контакты, аналитика и глобальные параметры сайта
        </p>
      </div>

      <SettingsForm
        initialData={{
          instagramUrl: settings?.instagramUrl,
          whatsappUrl: settings?.whatsappUrl,
          telegramUrl: settings?.telegramUrl,
          heroImageUrl: settings?.heroImageUrl,
          metaPixelId: settings?.metaPixelId,
          yandexMetricaId: settings?.yandexMetricaId,
          gaId: settings?.gaId,
        }}
      />
    </div>
  );
}
