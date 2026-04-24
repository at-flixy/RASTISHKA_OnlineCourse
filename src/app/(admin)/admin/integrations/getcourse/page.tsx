import { requireAdmin } from "@/lib/authz";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GetCourseConnectionTest } from "@/components/admin/GetCourseConnectionTest";
import { getGetCourseApiHost } from "@/lib/getcourse";

export default async function GetCourseIntegrationPage() {
  await requireAdmin();

  const hasConfig = !!(process.env.GETCOURSE_ACCOUNT && process.env.GETCOURSE_API_KEY);
  const apiHost = process.env.GETCOURSE_ACCOUNT
    ? getGetCourseApiHost(process.env.GETCOURSE_ACCOUNT)
    : "";

  return (
    <div className="max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Интеграция GetCourse</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Настройки синхронизации оплаченных заказов с вашим аккаунтом GetCourse
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Конфигурация</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-muted-foreground">API host</div>
            <div className="font-medium">
              {apiHost ? (
                <span className="font-mono">{apiHost}</span>
              ) : (
                <span className="text-destructive">Не настроен</span>
              )}
            </div>
            <div className="text-muted-foreground">API-ключ</div>
            <div className="font-medium">
              {process.env.GETCOURSE_API_KEY ? (
                <span className="font-mono">
                  {process.env.GETCOURSE_API_KEY.slice(0, 4)}•••••••••••
                </span>
              ) : (
                <span className="text-destructive">Не настроен</span>
              )}
            </div>
          </div>

          {!hasConfig && (
            <div className="rounded-md border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
              Укажите <code className="font-mono text-xs">GETCOURSE_ACCOUNT</code> и{" "}
              <code className="font-mono text-xs">GETCOURSE_API_KEY</code> в серверных переменных
              окружения.
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Секреты хранятся на сервере и никогда не отображаются в админке полностью.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Проверка соединения</CardTitle>
        </CardHeader>
        <CardContent>
          <GetCourseConnectionTest hasConfig={hasConfig} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Как настроить</CardTitle>
        </CardHeader>
        <CardContent className="max-w-none space-y-2 text-sm text-muted-foreground">
          <ol className="list-inside list-decimal space-y-2">
            <li>
              Создайте в GetCourse API-ключ с правами на чтение и запись.
            </li>
            <li>
              Сохраните <code className="font-mono">GETCOURSE_ACCOUNT</code> как обычный subdomain
              вроде <code className="font-mono">flixxxy4</code> или как полный URL вида{" "}
              <code className="font-mono">https://flixxxy4.getcourse.ru/</code>.
            </li>
            <li>
              Сохраните ключ в <code className="font-mono">GETCOURSE_API_KEY</code>.
            </li>
            <li>
              Для каждого продукта или тарифа укажите точное название группы GetCourse, доступ к
              которой нужно выдать после оплаты.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
