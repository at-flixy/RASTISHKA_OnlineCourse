"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Gift, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/order-meta";

type CertificatePreview = {
  amount: number;
  code: string;
  currency: string;
  product: {
    slug: string;
    title: string;
  };
  tariff: {
    name: string;
  } | null;
  title: string;
};

type GiftCertificateRedeemFormProps = {
  initialCode?: string;
};

export function GiftCertificateRedeemForm({ initialCode = "" }: GiftCertificateRedeemFormProps) {
  const [code, setCode] = useState(initialCode);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [preview, setPreview] = useState<CertificatePreview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isPending, startTransition] = useTransition();

  const validateCode = async () => {
    setMessage(null);
    setPreview(null);

    if (!code.trim()) {
      setMessage("Введите код сертификата");
      return;
    }

    setIsValidating(true);

    try {
      const response = await fetch("/api/gift-certificates/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json()) as CertificatePreview & { error?: string };

      if (!response.ok) {
        setMessage(data.error ?? "Сертификат не найден");
        return;
      }

      setPreview(data);
      setCode(data.code);
      setMessage("Сертификат найден. Заполните данные получателя доступа.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось проверить сертификат");
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/gift-certificates/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            customerEmail,
            customerName,
            customerPhone: customerPhone || null,
          }),
        });
        const data = (await response.json()) as { error?: string; redirectUrl?: string };

        if (!response.ok || !data.redirectUrl) {
          setMessage(data.error ?? "Не удалось активировать сертификат");
          return;
        }

        window.location.assign(data.redirectUrl);
      })().catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Не удалось активировать сертификат");
      });
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Gift className="h-4 w-4" />
            Подарочный сертификат
          </div>
          <CardTitle className="text-2xl">Активация сертификата</CardTitle>
          <CardDescription>
            Введите код из письма, проверьте курс и укажите email, на который нужно выдать доступ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-3">
              <Label htmlFor="certificateCode">Код сертификата</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="certificateCode"
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value);
                    setPreview(null);
                    setMessage(null);
                  }}
                  placeholder="GC-XXXXXXXX"
                  className="uppercase"
                  required
                />
                <Button type="button" variant="outline" onClick={validateCode} disabled={isValidating}>
                  {isValidating ? "Проверяем..." : "Проверить"}
                </Button>
              </div>
            </div>

            {preview && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                <div className="font-medium">{preview.title}</div>
                <div className="mt-1">Номинал: {formatMoney(preview.amount, preview.currency)}</div>
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
                <Label htmlFor="customerEmail">Email для доступа</Label>
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
                />
              </div>
            </div>

            {message && (
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                {message}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={isPending || !preview}>
              <ShieldCheck className="h-4 w-4" />
              {isPending ? "Активируем..." : "Активировать и получить доступ"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Что произойдёт дальше</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Сертификат можно активировать один раз.</p>
          <p>После активации мы создадим личный кабинет и отправим письмо на указанный email.</p>
          <p>Доступ к курсу будет выдан через GetCourse автоматически.</p>
        </CardContent>
      </Card>
    </div>
  );
}
