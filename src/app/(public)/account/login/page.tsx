import { AuthError } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { createPasswordSetupToken, normalizeEmail } from "@/lib/account";
import { db } from "@/lib/db";
import { sendAccountSetupEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function getSafeCallbackUrl(value?: string) {
  return value?.startsWith("/account") ? value : "/account";
}

export default async function AccountLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string; setup?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/account");

  const { callbackUrl, error, setup } = await searchParams;
  const safeCallbackUrl = getSafeCallbackUrl(callbackUrl);

  async function login(formData: FormData) {
    "use server";

    const email = normalizeEmail(String(formData.get("email") ?? ""));
    const password = String(formData.get("password") ?? "");
    const user = await db.user.findUnique({
      where: { email },
      select: {
        email: true,
        id: true,
        name: true,
        passwordHash: true,
      },
    });

    if (user && !user.passwordHash) {
      try {
        const { token } = await createPasswordSetupToken(user.id);
        await sendAccountSetupEmail({
          customerEmail: user.email,
          customerName: user.name,
          setupUrl: `${getSiteUrl()}/account/setup?token=${encodeURIComponent(token)}`,
        });
      } catch {
        redirect("/account/login?setup=failed");
      }

      redirect("/account/login?setup=sent");
    }

    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo: safeCallbackUrl,
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect("/account/login?error=invalid");
      }
      throw err;
    }
  }

  return (
    <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Вход в кабинет</CardTitle>
          <CardDescription>Используйте email, который был указан при оплате.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={login} className="space-y-4">
            {error === "invalid" && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                Неверный email или пароль.
              </div>
            )}
            {setup === "sent" && (
              <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                Ссылка для установки пароля отправлена на ваш email.
              </div>
            )}
            {setup === "failed" && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                Не удалось отправить письмо. Напишите в поддержку.
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            <Button type="submit" className="w-full">
              Войти
            </Button>
            <Button variant="link" className="w-full" asChild>
              <Link href="/">Вернуться на сайт</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
