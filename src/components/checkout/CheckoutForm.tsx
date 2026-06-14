"use client";

import { useState, useTransition, type FormEvent } from "react";
import Image from "next/image";
import { AlertTriangle, CreditCard, Gift, MessageCircle, Send, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/order-meta";
import type { CheckoutCurrency, CheckoutProvider, PurchaseType } from "@/lib/payments/catalog";

type CheckoutTariff = {
  durationLabel: string;
  id: string;
  includes: string[];
  name: string;
  priceKgs: number;
  priceUsd: number;
  tagline: string | null;
};

type CheckoutProduct = {
  durationLabel: string | null;
  priceKgs: number | null;
  priceUsd: number | null;
  shortDescription: string;
  slug: string;
  tariffs: CheckoutTariff[];
  title: string;
};

type CheckoutQuote = {
  amount: number;
  currency: string;
  discountAmount: number;
  promo: {
    code: string;
    description: string | null;
    id: string;
    percentOff: number;
  } | null;
  subtotalAmount: number;
};

type CheckoutFormProps = {
  availableProviders: CheckoutProvider[];
  currentUser?: {
    email: string;
    name: string;
  } | null;
  initialCurrency: CheckoutCurrency;
  initialProvider: CheckoutProvider;
  initialTariffId: string | null;
  manualPaymentContacts?: {
    telegramUrl?: string | null;
    whatsappUrl?: string | null;
  };
  paymentUnavailableReason?: string | null;
  product: CheckoutProduct;
  purchaseType: PurchaseType;
};

const providerCopy: Record<
  CheckoutProvider,
  {
    accent: string;
    description: string;
    nextStep: string;
    pendingLabel: string;
    recommendation: string;
    title: string;
  }
> = {
  FREEDOMPAY: {
    accent: "Основной",
    description: "Оплата картой через Freedom Pay с переходом на защищённую страницу провайдера.",
    nextStep:
      "Оплата пройдёт на защищённой странице Freedom Pay. После подтверждения сайт дождётся server-to-server уведомления или автоматически сверит статус.",
    pendingLabel: "Переход в Freedom Pay...",
    recommendation: "По умолчанию",
    title: "Freedom Pay",
  },
  STRIPE: {
    accent: "Резервный",
    description: "Оплата картой через Stripe Checkout с поддержкой международных карт и 3D Secure.",
    nextStep:
      "Оплата пройдёт на защищённой странице Stripe Checkout. После подтверждения заказ автоматически синхронизируется в системе.",
    pendingLabel: "Переход в Stripe...",
    recommendation: "Альтернатива",
    title: "Stripe",
  },
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
  availableProviders,
  currentUser,
  product,
  initialTariffId,
  initialCurrency,
  initialProvider,
  paymentUnavailableReason,
  manualPaymentContacts,
  purchaseType,
}: CheckoutFormProps) {
  const [selectedTariffId, setSelectedTariffId] = useState(initialTariffId);
  const [currency, setCurrency] = useState<CheckoutCurrency>(initialCurrency);
  const [provider, setProvider] = useState<CheckoutProvider>(
    availableProviders.includes(initialProvider) ? initialProvider : (availableProviders[0] ?? initialProvider)
  );
  const [customerName, setCustomerName] = useState(currentUser?.name ?? "");
  const [customerEmail, setCustomerEmail] = useState(currentUser?.email ?? "");
  const [customerPhone, setCustomerPhone] = useState("");
  const [giftRecipientEmail, setGiftRecipientEmail] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoteMessage, setQuoteMessage] = useState<string | null>(null);
  const [isQuotePending, setIsQuotePending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedTariff = product.tariffs.find((tariff) => tariff.id === selectedTariffId) ?? null;
  const priceKgs = selectedTariff?.priceKgs ?? product.priceKgs;
  const priceUsd = selectedTariff?.priceUsd ?? product.priceUsd;
  const availableCurrencies = getAvailableCurrencies(priceKgs, priceUsd);
  const amount = currency === "KGS" ? priceKgs : priceUsd;
  const finalAmount = quote?.currency === currency ? quote.amount : amount;
  const discountAmount = quote?.currency === currency ? quote.discountAmount : 0;
  const title = selectedTariff ? `${product.title} - ${selectedTariff.name}` : product.title;
  const currentProvider = providerCopy[provider];

  const resetQuote = () => {
    setQuote(null);
    setQuoteMessage(null);
  };

  const handleTariffChange = (tariffId: string) => {
    resetQuote();
    setSelectedTariffId(tariffId);

    const tariff = product.tariffs.find((item) => item.id === tariffId);
    const nextCurrencies = getAvailableCurrencies(tariff?.priceKgs ?? null, tariff?.priceUsd ?? null);

    if (!nextCurrencies.includes(currency)) {
      setCurrency(nextCurrencies[0] ?? "KGS");
    }
  };

  const handleCurrencyChange = (nextCurrency: CheckoutCurrency) => {
    resetQuote();
    setCurrency(nextCurrency);
  };

  const handlePromoCodeChange = (value: string) => {
    setPromoCode(value);
    resetQuote();
  };

  const handleCustomerEmailChange = (value: string) => {
    setCustomerEmail(value);
    resetQuote();
  };

  const handleApplyPromoCode = async () => {
    setError(null);
    setQuoteMessage(null);

    if (!promoCode.trim()) {
      resetQuote();
      return;
    }

    setIsQuotePending(true);

    try {
      const response = await fetch("/api/checkout/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productSlug: product.slug,
          tariffId: selectedTariffId,
          purchaseType,
          currency,
          customerEmail: customerEmail || null,
          promoCode,
        }),
      });
      const data = (await response.json()) as CheckoutQuote & { error?: string };

      if (!response.ok) {
        setQuote(null);
        setQuoteMessage(data.error ?? "Промокод не удалось применить");
        return;
      }

      setQuote(data);
      setQuoteMessage(data.promo ? `Промокод ${data.promo.code} применён` : null);
    } catch (quoteError) {
      setQuote(null);
      setQuoteMessage(quoteError instanceof Error ? quoteError.message : "Не удалось проверить промокод");
    } finally {
      setIsQuotePending(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (paymentUnavailableReason && finalAmount !== 0) {
      setError(paymentUnavailableReason);
      return;
    }

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
            provider,
            customerName,
            customerEmail,
            customerPhone,
            giftRecipientEmail: purchaseType === "GIFT_CERTIFICATE" ? giftRecipientEmail || null : null,
            promoCode: purchaseType === "COURSE" ? promoCode || null : null,
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
            <Badge variant="outline">{currentProvider.title}</Badge>
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
                    onClick={() => handleCurrencyChange(item)}
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

            {availableProviders.length > 1 && (
              <div className="space-y-3">
                <Label>Способ оплаты</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {availableProviders.map((providerKey) => {
                    const item = providerCopy[providerKey];
                    const active = provider === providerKey;

                    return (
                      <button
                        key={providerKey}
                        type="button"
                        onClick={() => setProvider(providerKey)}
                        className={`rounded-xl border p-4 text-left transition-colors ${
                          active
                            ? "border-primary bg-primary/5"
                            : "border-border bg-background hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="font-semibold text-foreground">{item.title}</div>
                            <div className="text-sm text-muted-foreground">{item.description}</div>
                          </div>
                          <Badge variant={providerKey === "FREEDOMPAY" ? "default" : "secondary"}>
                            {item.recommendation}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
                  onChange={(event) => handleCustomerEmailChange(event.target.value)}
                  placeholder="you@example.com"
                  readOnly={Boolean(currentUser?.email)}
                  className={currentUser?.email ? "bg-muted" : undefined}
                  required
                />
                {currentUser?.email && (
                  <p className="text-xs text-muted-foreground">
                    Заказ будет привязан к вашему кабинету.
                  </p>
                )}
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

            {purchaseType === "COURSE" && (
              <div className="space-y-3 rounded-xl border border-border p-4">
                <div className="space-y-1">
                  <Label htmlFor="promoCode">Промокод</Label>
                  <p className="text-xs text-muted-foreground">
                    Скидка применяется только к покупке курса и будет проверена перед оплатой.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="promoCode"
                    value={promoCode}
                    onChange={(event) => handlePromoCodeChange(event.target.value)}
                    placeholder="Например, MASSAGE10"
                    className="uppercase"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleApplyPromoCode}
                    disabled={isQuotePending || !promoCode.trim() || amount == null}
                  >
                    {isQuotePending ? "Проверяем..." : "Применить"}
                  </Button>
                </div>
                {quoteMessage && (
                  <p
                    className={`text-sm ${
                      quote?.promo ? "text-green-700" : "text-destructive"
                    }`}
                  >
                    {quoteMessage}
                  </p>
                )}
              </div>
            )}

            {paymentUnavailableReason && finalAmount !== 0 && (
              <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <div className="font-medium">Платежи временно недоступны</div>
                    <div className="mt-1">{paymentUnavailableReason}</div>
                    <div className="mt-2">
                      Сейчас можно оплатить вручную: напишите нам, мы пришлем реквизиты и выдадим доступ
                      после подтверждения оплаты.
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pl-7">
                  {manualPaymentContacts?.whatsappUrl && (
                    <a
                      href={manualPaymentContacts.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                  )}
                  {manualPaymentContacts?.telegramUrl && (
                    <a
                      href={manualPaymentContacts.telegramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700"
                    >
                      <Send className="h-4 w-4" />
                      Telegram
                    </a>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={
                isPending ||
                finalAmount == null ||
                (Boolean(paymentUnavailableReason) && finalAmount !== 0)
              }
            >
              <CreditCard className="h-4 w-4" />
              {paymentUnavailableReason && finalAmount !== 0
                ? "Платежи временно недоступны"
                : isPending
                  ? currentProvider.pendingLabel
                  : finalAmount === 0
                    ? "Получить доступ бесплатно"
                    : `Перейти к оплате - ${formatMoney(finalAmount ?? 0, currency)}`}
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
            <div className="flex items-start justify-between gap-3">
              <span className="text-muted-foreground">Провайдер</span>
              <div className="text-right">
                <div className="font-medium">{currentProvider.title}</div>
                <div className="text-xs text-muted-foreground">{currentProvider.accent}</div>
              </div>
            </div>
            <div className="flex items-start justify-between gap-3 border-t border-border pt-3">
              <span className="text-muted-foreground">Цена</span>
              <span className="font-medium">{formatMoney(amount ?? 0, currency)}</span>
            </div>
            {discountAmount > 0 && quote?.promo && (
              <div className="flex items-start justify-between gap-3 text-green-700">
                <span>Скидка {quote.promo.percentOff}% ({quote.promo.code})</span>
                <span>-{formatMoney(discountAmount, currency)}</span>
              </div>
            )}
            <div className="flex items-start justify-between gap-3 border-t border-border pt-3 text-base">
              <span className="font-medium">К оплате</span>
              <span className="font-semibold text-primary">{formatMoney(finalAmount ?? 0, currency)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Принимаем карты</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[
                { src: "/payments/visa.svg", alt: "Visa" },
                { src: "/payments/mastercard.svg", alt: "Mastercard" },
                { src: "/payments/elcart.png", alt: "Элкарт" },
              ].map(({ src, alt }) => (
                <div
                  key={alt}
                  className="h-8 w-14 border border-border rounded flex items-center justify-center overflow-hidden bg-white"
                >
                  <Image src={src} alt={alt} width={56} height={32} className="object-contain" />
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Оплата защищена. Данные карты не хранятся на нашем сайте.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Что будет дальше</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{currentProvider.nextStep}</span>
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
