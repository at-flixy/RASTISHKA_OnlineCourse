"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { Ban, Copy, Mail, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/order-meta";

type GiftCertificateRow = {
  amount: number;
  code: string;
  createdAt: string;
  currency: string;
  id: string;
  order: { id: string } | null;
  product: { id: string; slug: string; title: string } | null;
  recipientEmail: string | null;
  redeemedAt: string | null;
  redeemedByEmail: string | null;
  redeemedOrder: { id: string } | null;
  tariff: { id: string; name: string } | null;
  voidReason: string | null;
  voidedAt: string | null;
};

type GiftProductOption = {
  id: string;
  priceKgs: number | null;
  priceUsd: number | null;
  tariffs: Array<{
    id: string;
    name: string;
    priceKgs: number;
    priceUsd: number;
  }>;
  title: string;
};

type GiftCertificatesManagerProps = {
  initialCertificates: GiftCertificateRow[];
  products: GiftProductOption[];
};

function getCertificateStatus(certificate: GiftCertificateRow) {
  if (certificate.voidedAt) {
    return { label: "Аннулирован", variant: "destructive" as const };
  }

  if (certificate.redeemedAt) {
    return { label: "Погашен", variant: "secondary" as const };
  }

  return { label: "Активен", variant: "success" as const };
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("ru-RU") : "—";
}

export function GiftCertificatesManager({
  initialCertificates,
  products,
}: GiftCertificatesManagerProps) {
  const [certificates, setCertificates] = useState(initialCertificates);
  const [search, setSearch] = useState("");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [tariffId, setTariffId] = useState<string>("none");
  const [currency, setCurrency] = useState<"KGS" | "USD">("KGS");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const selectedProduct = products.find((product) => product.id === productId) ?? null;
  const selectedTariff =
    tariffId !== "none" ? selectedProduct?.tariffs.find((tariff) => tariff.id === tariffId) ?? null : null;
  const selectedPrice =
    currency === "KGS"
      ? selectedTariff?.priceKgs ?? selectedProduct?.priceKgs
      : selectedTariff?.priceUsd ?? selectedProduct?.priceUsd;

  const filteredCertificates = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return certificates;
    }

    return certificates.filter((certificate) =>
      [
        certificate.code,
        certificate.recipientEmail,
        certificate.redeemedByEmail,
        certificate.product?.title,
        certificate.tariff?.name,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query))
    );
  }, [certificates, search]);

  const issueCertificate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setIsPending(true);

    try {
      const response = await fetch("/api/admin/gift-certificates/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency,
          productId,
          recipientEmail: recipientEmail || null,
          tariffId: tariffId === "none" ? null : tariffId,
        }),
      });
      const data = (await response.json()) as GiftCertificateRow & { error?: string };

      if (!response.ok) {
        setMessage(data.error ?? "Не удалось выпустить сертификат");
        return;
      }

      setCertificates((current) => [data, ...current]);
      setRecipientEmail("");
      setMessage(`Сертификат ${data.code} выпущен`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось выпустить сертификат");
    } finally {
      setIsPending(false);
    }
  };

  const replaceCertificate = (updated: GiftCertificateRow) => {
    setCertificates((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  };

  const resendCertificate = async (certificate: GiftCertificateRow) => {
    setMessage(null);
    const response = await fetch(`/api/admin/gift-certificates/${certificate.id}/resend`, {
      method: "POST",
    });
    const data = (await response.json()) as GiftCertificateRow & { error?: string };

    if (!response.ok) {
      setMessage(data.error ?? "Не удалось отправить сертификат");
      return;
    }

    setMessage(`Сертификат ${certificate.code} отправлен`);
  };

  const voidCertificate = async (certificate: GiftCertificateRow) => {
    const reason = window.prompt("Причина аннулирования", certificate.voidReason ?? "");

    if (reason === null) {
      return;
    }

    setMessage(null);
    const response = await fetch(`/api/admin/gift-certificates/${certificate.id}/void`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const data = (await response.json()) as GiftCertificateRow & { error?: string };

    if (!response.ok) {
      setMessage(data.error ?? "Не удалось аннулировать сертификат");
      return;
    }

    replaceCertificate(data);
    setMessage(`Сертификат ${certificate.code} аннулирован`);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Выпустить вручную</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={issueCertificate}>
            <div className="space-y-2">
              <Label>Курс</Label>
              <Select
                value={productId}
                onValueChange={(value) => {
                  setProductId(value);
                  setTariffId("none");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите курс" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProduct && selectedProduct.tariffs.length > 0 && (
              <div className="space-y-2">
                <Label>Тариф</Label>
                <Select value={tariffId} onValueChange={setTariffId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без тарифа</SelectItem>
                    {selectedProduct.tariffs.map((tariff) => (
                      <SelectItem key={tariff.id} value={tariff.id}>
                        {tariff.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Валюта</Label>
              <Select value={currency} onValueChange={(value) => setCurrency(value as "KGS" | "USD")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KGS">KGS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Номинал: {selectedPrice != null ? formatMoney(selectedPrice, currency) : "цена не настроена"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Email получателя</Label>
              <Input
                id="recipientEmail"
                type="email"
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
                placeholder="recipient@example.com"
              />
            </div>

            {message && (
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                {message}
              </div>
            )}

            <Button type="submit" disabled={isPending || !productId}>
              <Plus className="h-4 w-4" />
              {isPending ? "Выпускаем..." : "Выпустить"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Все сертификаты ({filteredCertificates.length})</CardTitle>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по коду, email или курсу"
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredCertificates.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Сертификаты не найдены</p>
          ) : (
            filteredCertificates.map((certificate) => {
              const status = getCertificateStatus(certificate);

              return (
                <div key={certificate.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-base font-semibold">{certificate.code}</span>
                        <Badge variant={status.variant}>{status.label}</Badge>
                        <Badge variant="outline">{formatMoney(certificate.amount, certificate.currency)}</Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {certificate.product?.title ?? "Курс удалён"}
                        {certificate.tariff ? ` - ${certificate.tariff.name}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void navigator.clipboard.writeText(certificate.code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!certificate.recipientEmail || Boolean(certificate.voidedAt)}
                        onClick={() => void resendCertificate(certificate)}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={Boolean(certificate.redeemedAt) || Boolean(certificate.voidedAt)}
                        onClick={() => void voidCertificate(certificate)}
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <span className="text-muted-foreground">Получатель:</span>{" "}
                      {certificate.recipientEmail ?? "—"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Погасил:</span>{" "}
                      {certificate.redeemedByEmail ?? "—"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Создан:</span> {formatDate(certificate.createdAt)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Погашен:</span> {formatDate(certificate.redeemedAt)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Заказ покупки:</span>{" "}
                      {certificate.order ? (
                        <Link className="underline" href={`/admin/orders/${certificate.order.id}`}>
                          {certificate.order.id}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Заказ доступа:</span>{" "}
                      {certificate.redeemedOrder ? (
                        <Link className="underline" href={`/admin/orders/${certificate.redeemedOrder.id}`}>
                          {certificate.redeemedOrder.id}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </div>
                    {certificate.voidReason && (
                      <div className="sm:col-span-2 lg:col-span-3">
                        <span className="text-muted-foreground">Причина:</span> {certificate.voidReason}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
