import { CheckoutForm } from "@/components/checkout/CheckoutForm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getCheckoutProduct,
  getDefaultCurrency,
  getDefaultTariffId,
  normalizeCheckoutProvider,
  normalizePurchaseType,
} from "@/lib/payments/catalog"
import { getAvailableCheckoutProviders } from "@/lib/payments/provider-meta"
import { notFound } from "next/navigation"
import { connection } from "next/server"

export const dynamic = "force-dynamic";

interface CheckoutPageProps {
  searchParams: Promise<{
    currency?: string;
    product?: string;
    provider?: string;
    tariff?: string;
    type?: string;
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
  const availableProviders = getAvailableCheckoutProviders();
  const initialProvider = normalizeCheckoutProvider(params.provider ?? null, availableProviders);

  return (
    <div className="bg-gradient-to-b from-muted/40 via-background to-background py-12 sm:py-16">
      <div className="mx-auto max-w-6xl space-y-8 px-4 sm:px-6">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">
            {purchaseType === "GIFT_CERTIFICATE"
              ? "Оформление подарочного сертификата"
              : "Оформление оплаты"}
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            Проверьте состав заказа, заполните данные и перейдите на защищённую страницу платёжного
            провайдера.
          </p>
        </div>

        {availableProviders.length > 0 ? (
          <CheckoutForm
            availableProviders={availableProviders}
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
            initialProvider={initialProvider}
            purchaseType={purchaseType}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Платежи временно недоступны</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Платёжный провайдер ещё не настроен в окружении проекта.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
