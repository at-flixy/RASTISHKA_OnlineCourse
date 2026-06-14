import type { Metadata } from "next";
import { connection } from "next/server";
import { GiftCertificateRedeemForm } from "@/components/gift-certificates/GiftCertificateRedeemForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Активация сертификата | Светлана Масалова",
  description: "Активируйте подарочный сертификат и получите доступ к онлайн-курсу.",
};

interface GiftCertificateRedeemPageProps {
  searchParams: Promise<{
    code?: string;
  }>;
}

export default async function GiftCertificateRedeemPage({
  searchParams,
}: GiftCertificateRedeemPageProps) {
  await connection();
  const params = await searchParams;

  return (
    <div className="py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <GiftCertificateRedeemForm initialCode={params.code ?? ""} />
      </div>
    </div>
  );
}
