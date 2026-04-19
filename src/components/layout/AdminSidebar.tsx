"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  ShoppingCart,
  Gift,
  FileText,
  Settings,
  Plug,
  LogOut,
  Layout,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/admin", label: "Дашборд", icon: LayoutDashboard, exact: true },
  { href: "/admin/landing", label: "Главная страница", icon: Layout },
  { href: "/admin/products", label: "Продукты", icon: BookOpen },
  { href: "/admin/orders", label: "Заказы", icon: ShoppingCart },
  { href: "/admin/gift-certificates", label: "Сертификаты", icon: Gift },
  { href: "/admin/pages", label: "Страницы", icon: FileText },
  { href: "/admin/settings", label: "Настройки", icon: Settings },
  { href: "/admin/integrations/getcourse", label: "Интеграции", icon: Plug },
];

interface AdminSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const content = (
    <aside className="flex flex-col w-64 h-full bg-[var(--sidebar-bg)] text-[var(--sidebar-fg)]">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-1">Админ-панель</p>
          <p className="text-white font-semibold text-sm leading-tight">Светлана Масалова</p>
        </div>
        {/* Close button on mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-white/60 hover:text-white p-1"
            aria-label="Закрыть меню"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active
                  ? "bg-[var(--sidebar-accent)] text-white font-medium"
                  : "text-[var(--sidebar-fg)] hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-4">
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--sidebar-fg)] hover:bg-white/10 hover:text-white transition-colors w-full"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Выйти
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-64 min-h-screen shrink-0">
        {content}
      </div>

      {/* Mobile drawer */}
      {open !== undefined && (
        <>
          {/* Overlay */}
          <div
            className={cn(
              "fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-200",
              open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
            onClick={onClose}
          />
          {/* Drawer */}
          <div
            className={cn(
              "fixed inset-y-0 left-0 z-50 w-64 lg:hidden transition-transform duration-200",
              open ? "translate-x-0" : "-translate-x-full"
            )}
          >
            {content}
          </div>
        </>
      )}
    </>
  );
}
