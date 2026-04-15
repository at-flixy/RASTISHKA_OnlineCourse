import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@/components/Analytics";

export const metadata: Metadata = {
  title: {
    default: "Светлана Масалова — Онлайн-курсы детского массажа",
    template: "%s | Светлана Масалова",
  },
  description:
    "Онлайн-курсы детского и грудничкового массажа. Работа с особенными детьми (РАС, ЗПРР, СДВГ). Автор: Светлана Масалова, реабилитолог с 10-летним опытом.",
  metadataBase: new URL(process.env.SITE_URL ?? "https://masalova.com"),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
