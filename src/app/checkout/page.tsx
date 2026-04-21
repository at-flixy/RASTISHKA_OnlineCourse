import { connection } from "next/server";
import { notFound } from "next/navigation";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import {
  getCheckoutProduct,
  getDefaultCurrency,
  getDefaultTariffId,
  normalizePurchaseType,
} from "@/lib/payments/catalog";

export const dynamic = "force-dynamic";

interface CheckoutPageProps {
  searchParams: Promise<{
    product?: string;
    tariff?: string;
    type?: string;
    currency?: string;
  }>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  await connection();

  const params = await searchParams;
  const productSlug = params.product;

  if (!productSlug) {
    notFound();
  }

  let product;

  try {
    product = await getCheckoutProduct(productSlug);
  } catch {
    notFound();
  }

  const purchaseType = normalizePurchaseType(params.type);
  const initialTariffId = getDefaultTariffId(product.tariffs, params.tariff ?? null);
  const selectedTariff = product.tariffs.find((tariff) => tariff.id === initialTariffId) ?? null;
  const initialCurrency = getDefaultCurrency({
    priceKgs: selectedTariff?.priceKgs ?? product.priceKgs,
    priceUsd: selectedTariff?.priceUsd ?? product.priceUsd,
    requestedCurrency: params.currency ?? null,
  });

  return (
    <div className="bg-gradient-to-b from-muted/40 via-background to-background py-12 sm:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">
            {purchaseType === "GIFT_CERTIFICATE" ? "Оформление подарочного сертификата" : "Оформление оплаты"}
          </h1>
          <p className="text-muted-foreground mt-3 text-base sm:text-lg">
            Проверьте состав заказа, укажите контактные данные и перейдите на безопасную страницу Stripe для оплаты картой.
          </p>
        </div>

        <CheckoutForm
          product={{
            slug: product.slug,
            title: product.title,
            shortDescription: product.shortDescription,
            durationLabel: product.durationLabel,
            priceKgs: product.priceKgs,
            priceUsd: product.priceUsd,
            tariffs: product.tariffs.map((tariff) => ({
              id: tariff.id,
              name: tariff.name,
              tagline: tariff.tagline,
              durationLabel: tariff.durationLabel,
              priceKgs: tariff.priceKgs,
              priceUsd: tariff.priceUsd,
              includes: tariff.includes,
            })),
          }}
          initialTariffId={initialTariffId}
          initialCurrency={initialCurrency}
          purchaseType={purchaseType}
        />
      </div>
    </div>
  );
}
