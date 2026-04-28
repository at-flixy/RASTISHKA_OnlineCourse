import { Analytics } from "@/components/Analytics";

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Analytics />
    </>
  );
}
