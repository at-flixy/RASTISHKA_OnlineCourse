import Link from "next/link";
import Image from "next/image";
import { connection } from "next/server";
import { hasDatabaseUrl } from "@/lib/database-url";
import { getSiteSettings } from "@/lib/site-settings";
import { MessageCircle, Send, AtSign } from "lucide-react";
import { legalEntity } from "@/lib/legal";

export async function Footer() {
  if (hasDatabaseUrl()) {
    await connection();
  }

  const settings = await getSiteSettings();

  return (
    <footer className="bg-[#1e1b4b] text-white/80 mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <h3 className="text-white font-semibold text-lg">{legalEntity.brand}</h3>
            <p className="text-sm leading-relaxed">
              Реабилитолог, специалист по детскому массажу. Онлайн-курсы для родителей и специалистов.
            </p>
            <div className="flex items-center gap-2 pt-1">
              {settings?.whatsappUrl && (
                <a
                  href={settings.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
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
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
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
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  title="Instagram"
                >
                  <AtSign className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            <h4 className="text-white font-medium">Навигация</h4>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/" className="hover:text-white transition-colors">Главная</Link>
              <Link href="/about" className="hover:text-white transition-colors">Обо мне</Link>
              <Link href="/gift-certificate" className="hover:text-white transition-colors">Подарочный сертификат</Link>
            </nav>

            <h4 className="text-white font-medium pt-2">Документы</h4>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/offer" className="hover:text-white transition-colors">Публичная оферта</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Политика конфиденциальности</Link>
              <Link href="/refund" className="hover:text-white transition-colors">Правила возврата</Link>
            </nav>
          </div>

          {/* Contacts */}
          <div className="space-y-3">
            <h4 className="text-white font-medium">Контакты</h4>
            <div className="flex flex-col gap-2 text-sm">
              <a
                href={`tel:${legalEntity.publicPhone.replace(/\s/g, "")}`}
                className="hover:text-white transition-colors"
              >
                {legalEntity.publicPhone}
              </a>
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h4 className="text-white font-medium">Организация</h4>
            <div className="text-xs leading-relaxed text-white/60 space-y-1">
              <p>ИП {legalEntity.name}</p>
              <p>ИНН: {legalEntity.inn}</p>
              <p>ОКПО: {legalEntity.okpo}</p>
              <p className="pt-1">{legalEntity.address}</p>
            </div>
          </div>
        </div>

        {/* Payment logos */}
        <div className="border-t border-white/10 mt-8 pt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-white/40">Принимаем карты:</span>
            {[
              { src: "/payments/visa.svg", alt: "Visa" },
              { src: "/payments/mastercard.svg", alt: "Mastercard" },
              { src: "/payments/elcart.png", alt: "Элкарт" },
              { src: "/payments/freedompay.svg", alt: "Freedom Pay" },
            ].map(({ src, alt }) => (
              <div
                key={alt}
                className="h-8 w-14 bg-white rounded flex items-center justify-center overflow-hidden"
              >
                <Image src={src} alt={alt} width={56} height={32} className="object-contain" />
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-white/40">
            <p>© {new Date().getFullYear()} {legalEntity.brand}. Все права защищены.</p>
            <p>ИП {legalEntity.name} | ИНН {legalEntity.inn}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
