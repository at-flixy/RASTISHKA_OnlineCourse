import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { hasDatabaseUrl } from "@/lib/database-url";
import { MessageCircle, Send, AtSign } from "lucide-react";

export async function Footer() {
  if (hasDatabaseUrl()) {
    await connection();
  }

  const settings = hasDatabaseUrl()
    ? await db.siteSettings.findUnique({ where: { id: 1 } })
    : null;

  return (
    <footer className="bg-[#1e1b4b] text-white/80 mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <h3 className="text-white font-semibold text-lg">Светлана Масалова</h3>
            <p className="text-sm leading-relaxed">
              Реабилитолог, специалист по детскому массажу. Онлайн-курсы для родителей и специалистов.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <h4 className="text-white font-medium">Навигация</h4>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/" className="hover:text-white transition-colors">Главная</Link>
              <Link href="/about" className="hover:text-white transition-colors">Обо мне</Link>
              <Link href="/gift-certificate" className="hover:text-white transition-colors">Подарочный сертификат</Link>
            </nav>
          </div>

          {/* Contacts */}
          <div className="space-y-3">
            <h4 className="text-white font-medium">Контакты</h4>
            <div className="flex items-center gap-3">
              {settings?.whatsappUrl && (
                <a
                  href={settings.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  title="WhatsApp"
                >
                  <MessageCircle className="h-5 w-5" />
                </a>
              )}
              {settings?.telegramUrl && (
                <a
                  href={settings.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  title="Telegram"
                >
                  <Send className="h-5 w-5" />
                </a>
              )}
              {settings?.instagramUrl && (
                <a
                  href={settings.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  title="Instagram"
                >
                  <AtSign className="h-5 w-5" />
                </a>
              )}
            </div>
            {!settings?.whatsappUrl && !settings?.telegramUrl && !settings?.instagramUrl && (
              <p className="text-sm text-white/40">Контакты не настроены</p>
            )}
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
          <p>© {new Date().getFullYear()} Светлана Масалова. Все права защищены.</p>
          <p>Бишкек, Кыргызстан</p>
        </div>
      </div>
    </footer>
  );
}
