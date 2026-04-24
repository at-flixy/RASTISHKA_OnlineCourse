import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCustomer } from "@/lib/authz";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export const dynamic = "force-dynamic";

export default async function AccountProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const session = await requireCustomer("/account/profile");
  const { error, saved } = await searchParams;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      createdAt: true,
      email: true,
      name: true,
    },
  });

  if (!user) {
    redirect("/account/login");
  }

  async function updateProfile(formData: FormData) {
    "use server";

    const session = await requireCustomer("/account/profile");
    const parsed = profileSchema.safeParse({
      name: formData.get("name"),
    });

    if (!parsed.success) {
      redirect("/account/profile?error=invalid");
    }

    await db.user.update({
      where: { id: session.user.id },
      data: {
        name: parsed.data.name,
      },
    });

    redirect("/account/profile?saved=1");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Профиль</CardTitle>
          <CardDescription>Эти данные используются для заказов и писем по доступу.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateProfile} className="space-y-4">
            {saved && (
              <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                Профиль обновлен.
              </div>
            )}
            {error === "invalid" && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                Укажите имя не короче 2 символов.
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Имя</Label>
              <Input id="name" name="name" defaultValue={user.name} required minLength={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email} readOnly className="bg-muted" />
            </div>
            <Button type="submit">Сохранить</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Аккаунт</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Создан:</span>{" "}
            {user.createdAt.toLocaleDateString("ru-RU")}
          </div>
          <div>
            <span className="text-muted-foreground">Email:</span> {user.email}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
