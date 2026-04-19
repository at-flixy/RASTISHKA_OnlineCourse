"use client";

import { useState } from "react";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Menu } from "lucide-react";

export function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[var(--sidebar-bg)] text-white sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            aria-label="Открыть меню"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold">Светлана Масалова — Админ</span>
        </header>

        <main className="flex-1 flex flex-col overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
