import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn } from "@/lib/auth";
import { consumePasswordSetupToken, getValidPasswordSetupToken } from "@/lib/account";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const passwordSchema = z
  .object({
    confirmPassword: z.string().min(8),
    password: z.string().min(8),
    token: z.string().min(1),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
  });

export default async function AccountSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; token?: string }>;
}) {
  const { error, token = "" } = await searchParams;
  const setupToken = await getValidPasswordSetupToken(token);

  async function completeSetup(formData: FormData) {
    "use server";

    const parsed = passwordSchema.safeParse({
      confirmPassword: formData.get("confirmPassword"),
      password: formData.get("password"),
      token: formData.get("token"),
    });

    const rawToken = String(formData.get("token") ?? "");

    if (!parsed.success) {
      redirect(`/account/setup?token=${encodeURIComponent(rawToken)}&error=password`);
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await consumePasswordSetupToken({
      passwordHash,
      token: parsed.data.token,
    });

    if (!user) {
      redirect("/account/setup?error=invalid");
    }

    try {
      await signIn("credentials", {
        email: user.email,
        password: parsed.data.password,
        redirectTo: "/account",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect("/account/login?error=invalid");
      }
      throw err;
    }
  }

  if (!setupToken) {
    return (
      <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl">Ссылка недействительна</CardTitle>
            <CardDescription>Запросите новую ссылку через форму входа или напишите в поддержку.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/account/login">Перейти ко входу</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Создайте пароль</CardTitle>
          <CardDescription>{setupToken.user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={completeSetup} className="space-y-4">
            <input type="hidden" name="token" value={token} />
            {error === "password" && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                Пароль должен быть не короче 8 символов, оба поля должны совпадать.
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Повторите пароль</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full">
              Сохранить и войти
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
