import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="bg-muted/30 py-8 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-6">
        {session?.user && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
            <nav className="flex flex-wrap items-center gap-2 text-sm">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/account">Мои курсы</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/account/orders">Заказы</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/account/profile">Профиль</Link>
              </Button>
            </nav>
            <form action={logout}>
              <Button type="submit" variant="outline" size="sm">
                Выйти
              </Button>
            </form>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
