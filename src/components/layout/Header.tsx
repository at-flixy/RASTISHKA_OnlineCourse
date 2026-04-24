import Link from "next/link";
import { connection } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasDatabaseUrl } from "@/lib/database-url";
import { MessageCircle, Send, AtSign, User } from "lucide-react";

export async function Header() {
  if (hasDatabaseUrl()) {
    await connection();
  }

  const [settings, session] = await Promise.all([
    hasDatabaseUrl() ? db.siteSettings.findUnique({ where: { id: 1 } }) : null,
    auth(),
  ]);
  const accountHref = session?.user?.role === "ADMIN" ? "/admin" : "/account";

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex flex-col leading-tight shrink-0">
          <span className="text-lg font-bold text-primary">Светлана Масалова</span>
          <span className="text-xs text-muted-foreground hidden sm:block">Детский массаж онлайн</span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/courses/massazh-osobennye-deti" className="text-foreground/70 hover:text-primary transition-colors">
            Курсы
          </Link>
          <Link href="/about" className="text-foreground/70 hover:text-primary transition-colors">
            Обо мне
          </Link>
          <Link href="/gift-certificate" className="text-foreground/70 hover:text-primary transition-colors">
            Сертификат
          </Link>
        </nav>

        {/* Social contacts */}
        <div className="flex items-center gap-2">
          <Link
            href={session?.user ? accountHref : "/account/login"}
            className="hidden items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary sm:inline-flex"
          >
            <User className="h-4 w-4" />
            {session?.user ? "Кабинет" : "Войти"}
          </Link>
          {settings?.whatsappUrl && (
            <a
              href={settings.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-9 h-9 rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
              title="WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          )}
          {settings?.telegramUrl && (
            <a
              href={settings.telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-9 h-9 rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors"
              title="Telegram"
            >
              <Send className="h-4 w-4" />
            </a>
          )}
          {settings?.instagramUrl && (
            <a
              href={settings.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-9 h-9 rounded-full bg-pink-50 text-pink-600 hover:bg-pink-100 transition-colors"
              title="Instagram"
            >
              <AtSign className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
