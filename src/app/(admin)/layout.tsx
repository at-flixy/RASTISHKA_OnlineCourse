import { SessionProvider } from "@/components/providers/SessionProvider";
import { AdminLayoutWrapper } from "@/components/layout/AdminLayoutWrapper";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AdminLayoutWrapper>{children}</AdminLayoutWrapper>
    </SessionProvider>
  );
}
