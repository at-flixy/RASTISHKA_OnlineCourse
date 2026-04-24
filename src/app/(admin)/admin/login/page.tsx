import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { normalizeEmail } from "@/lib/account";
import { db } from "@/lib/db";
import { AuthError } from "next-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  if (session?.user?.role === "ADMIN") redirect("/admin");
  if (session?.user) redirect("/account");

  const { callbackUrl, error } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    try {
      const email = normalizeEmail(String(formData.get("email") ?? ""));
      const user = await db.user.findUnique({
        where: { email },
        select: { role: true },
      });

      if (user?.role !== "ADMIN") {
        redirect(`/admin/login?error=invalid`);
      }

      await signIn("credentials", {
        email,
        password: formData.get("password"),
        redirectTo: callbackUrl ?? "/admin",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect(`/admin/login?error=invalid`);
      }
      throw err;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--sidebar-bg)] to-[var(--sidebar-accent)] p-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Вход</CardTitle>
          <CardDescription className="text-center">
            Панель управления сайтом
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={login} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive text-center">
                Неверный email или пароль
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@masalova.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full">
              Войти
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
