"use client";

import { useState, useTransition, type FormEvent } from "react";
import { CreditCard, Gift, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/order-meta";
import type { CheckoutCurrency, PurchaseType } from "@/lib/payments/catalog";

type CheckoutTariff = {
  id: string;
  name: string;
  tagline: string | null;
  durationLabel: string;
  priceKgs: number;
  priceUsd: number;
  includes: string[];
};

type CheckoutProduct = {
  slug: string;
  title: string;
  shortDescription: string;
  durationLabel: string | null;
  priceKgs: number | null;
  priceUsd: number | null;
  tariffs: CheckoutTariff[];
};

type CheckoutFormProps = {
  product: CheckoutProduct;
  initialTariffId: string | null;
  initialCurrency: CheckoutCurrency;
  purchaseType: PurchaseType;
};

function getAvailableCurrencies(priceKgs: number | null, priceUsd: number | null) {
  const currencies: CheckoutCurrency[] = [];

  if (priceKgs != null) {
    currencies.push("KGS");
  }

  if (priceUsd != null) {
    currencies.push("USD");
  }

  return currencies;
}

export function CheckoutForm({
  product,
  initialTariffId,
  initialCurrency,
  purchaseType,
}: CheckoutFormProps) {
  const [selectedTariffId, setSelectedTariffId] = useState(initialTariffId);
  const [currency, setCurrency] = useState<CheckoutCurrency>(initialCurrency);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [giftRecipientEmail, setGiftRecipientEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedTariff = product.tariffs.find((tariff) => tariff.id === selectedTariffId) ?? null;
  const priceKgs = selectedTariff?.priceKgs ?? product.priceKgs;
  const priceUsd = selectedTariff?.priceUsd ?? product.priceUsd;
  const availableCurrencies = getAvailableCurrencies(priceKgs, priceUsd);
  const amount = currency === "KGS" ? priceKgs : priceUsd;
  const title = selectedTariff ? `${product.title} — ${selectedTariff.name}` : product.title;

  const handleTariffChange = (tariffId: string) => {
    setSelectedTariffId(tariffId);

    const tariff = product.tariffs.find((item) => item.id === tariffId);
    const nextCurrencies = getAvailableCurrencies(tariff?.priceKgs ?? null, tariff?.priceUsd ?? null);

    if (!nextCurrencies.includes(currency)) {
      setCurrency(nextCurrencies[0] ?? "KGS");
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/checkout/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productSlug: product.slug,
            tariffId: selectedTariffId,
            purchaseType,
            currency,
            customerName,
            customerEmail,
            customerPhone,
            giftRecipientEmail: purchaseType === "GIFT_CERTIFICATE" ? giftRecipientEmail || null : null,
          }),
        });

        const data = (await response.json()) as { error?: string; url?: string };

        if (!response.ok || !data.url) {
          setError(data.error ?? "Не удалось создать платёжную сессию");
          return;
        }

        window.location.assign(data.url);
      })().catch((submitError: unknown) => {
        setError(submitError instanceof Error ? submitError.message : "Неизвестная ошибка");
      });
    });
  };

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={purchaseType === "GIFT_CERTIFICATE" ? "secondary" : "default"}>
              {purchaseType === "GIFT_CERTIFICATE" ? "Подарок" : "Оплата курса"}
            </Badge>
            <Badge variant="outline">Stripe Checkout</Badge>
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{product.shortDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {product.tariffs.length > 0 && (
              <div className="space-y-3">
                <Label>Тариф</Label>
                <div className="grid gap-3">
                  {product.tariffs.map((tariff) => {
                    const active = tariff.id === selectedTariffId;

                    return (
                      <button
                        key={tariff.id}
                        type="button"
                        onClick={() => handleTariffChange(tariff.id)}
                        className={`rounded-xl border p-4 text-left transition-colors ${
                          active
                            ? "border-primary bg-primary/5"
                            : "border-border bg-background hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-foreground">{tariff.name}</div>
                            {tariff.tagline && (
                              <div className="mt-1 text-sm text-muted-foreground">{tariff.tagline}</div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-primary">
                              {formatMoney(tariff.priceKgs, "KGS")}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatMoney(tariff.priceUsd, "USD")}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Label>Валюта оплаты</Label>
              <div className="flex flex-wrap gap-3">
                {availableCurrencies.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCurrency(item)}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                      currency === item
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="customerName">Ваше имя</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Имя и фамилия"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Телефон</Label>
                <Input
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  placeholder="+996 555 123 456"
                  required
                />
              </div>
              {purchaseType === "GIFT_CERTIFICATE" && (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="giftRecipientEmail">Email получателя сертификата</Label>
                  <Input
                    id="giftRecipientEmail"
                    type="email"
                    value={giftRecipientEmail}
                    onChange={(event) => setGiftRecipientEmail(event.target.value)}
                    placeholder="recipient@example.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Если поле пустое, код сертификата придёт только вам.
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={isPending || amount == null}>
              <CreditCard className="h-4 w-4" />
              {isPending
                ? "Переход к оплате..."
                : `Перейти к оплате — ${formatMoney(amount ?? 0, currency)}`}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Итог заказа</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="text-muted-foreground">Продукт</span>
              <span className="text-right font-medium">{title}</span>
            </div>
            {selectedTariff && (
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Доступ</span>
                <span className="text-right font-medium">{selectedTariff.durationLabel}</span>
              </div>
            )}
            {!selectedTariff && product.durationLabel && (
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Доступ</span>
                <span className="text-right font-medium">{product.durationLabel}</span>
              </div>
            )}
            <div className="flex items-start justify-between gap-3">
              <span className="text-muted-foreground">Валюта</span>
              <span className="font-medium">{currency}</span>
            </div>
            <div className="flex items-start justify-between gap-3 border-t border-border pt-3 text-base">
              <span className="font-medium">К оплате</span>
              <span className="font-semibold text-primary">{formatMoney(amount ?? 0, currency)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Что будет дальше</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Оплата пройдёт на защищённой странице Stripe с поддержкой 3D Secure.</span>
            </div>
            <div className="flex items-start gap-2">
              <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>После подтверждения оплаты заказ автоматически попадёт в систему.</span>
            </div>
            <div className="flex items-start gap-2">
              <Gift className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                {purchaseType === "GIFT_CERTIFICATE"
                  ? "Для подарка будет выпущен код сертификата и отправлен по email."
                  : "Доступ к курсу будет выдан через GetCourse после подтверждения оплаты."}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
