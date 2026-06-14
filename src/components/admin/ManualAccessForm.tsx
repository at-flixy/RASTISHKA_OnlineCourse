"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
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

type ManualAccessTariff = {
  durationLabel: string;
  getcourseGroupName: string;
  id: string;
  name: string;
};

type ManualAccessProduct = {
  getcourseGroupName: string | null;
  id: string;
  slug: string;
  tariffs: ManualAccessTariff[];
  title: string;
};

type ManualAccessFormProps = {
  products: ManualAccessProduct[];
};

type GrantAccessResponse = {
  error?: string;
  order?: {
    id: string;
    syncError: string | null;
    syncStatus: string;
  };
};

export function ManualAccessForm({ products }: ManualAccessFormProps) {
  const firstProduct = products[0] ?? null;
  const [productId, setProductId] = useState(firstProduct?.id ?? "");
  const selectedProduct = useMemo(
    () => products.find((product) => product.id === productId) ?? null,
    [productId, products]
  );
  const [tariffId, setTariffId] = useState(firstProduct?.tariffs[0]?.id ?? "");
  const selectedTariff = selectedProduct?.tariffs.find((tariff) => tariff.id === tariffId) ?? null;
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GrantAccessResponse["order"] | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleProductChange = (nextProductId: string) => {
    const nextProduct = products.find((product) => product.id === nextProductId) ?? null;

    setProductId(nextProductId);
    setTariffId(nextProduct?.tariffs[0]?.id ?? "");
    setResult(null);
    setError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);

    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/admin/access/grant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerEmail,
            customerName,
            customerPhone,
            productId,
            tariffId: selectedProduct?.tariffs.length ? tariffId : null,
          }),
        });
        const data = (await response.json()) as GrantAccessResponse;

        if (!response.ok || !data.order) {
          setError(data.error ?? "Не удалось выдать доступ");
          return;
        }

        setResult(data.order);
        setCustomerEmail("");
        setCustomerName("");
        setCustomerPhone("");
      })().catch((submitError: unknown) => {
        setError(submitError instanceof Error ? submitError.message : "Неизвестная ошибка");
      });
    });
  };

  const groupNames = [
    selectedProduct?.getcourseGroupName,
    selectedTariff?.getcourseGroupName,
  ].filter((groupName): groupName is string => Boolean(groupName));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Выдать доступ вручную</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="manualAccessEmail">Email ученика</Label>
              <Input
                id="manualAccessEmail"
                type="email"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                placeholder="student@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manualAccessName">Имя</Label>
              <Input
                id="manualAccessName"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Имя и фамилия"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manualAccessPhone">Телефон</Label>
              <Input
                id="manualAccessPhone"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                placeholder="+996 555 123 456"
              />
            </div>
            <div className="space-y-2">
              <Label>Курс</Label>
              <Select value={productId} onValueChange={handleProductChange} disabled={products.length === 0}>
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
          </div>

          {selectedProduct && selectedProduct.tariffs.length > 0 && (
            <div className="space-y-2">
              <Label>Тариф</Label>
              <Select value={tariffId} onValueChange={setTariffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тариф" />
                </SelectTrigger>
                <SelectContent>
                  {selectedProduct.tariffs.map((tariff) => (
                    <SelectItem key={tariff.id} value={tariff.id}>
                      {tariff.name} - доступ {tariff.durationLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
            <div className="text-muted-foreground">Группы GetCourse для выдачи доступа</div>
            <div className="mt-1 space-y-1 font-medium">
              {groupNames.length > 0
                ? groupNames.map((groupName) => <div key={groupName}>{groupName}</div>)
                : "Не настроены"}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {result && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              <CheckCircle className="h-4 w-4" />
              <span>Заказ создан, синхронизация:</span>
              <Badge variant={result.syncStatus === "SUCCESS" ? "success" : "secondary"}>
                {result.syncStatus}
              </Badge>
              {result.syncError && <span className="text-destructive">{result.syncError}</span>}
              <Link href={`/admin/orders/${result.id}`} className="font-medium underline">
                Открыть заказ
              </Link>
            </div>
          )}

          <Button type="submit" disabled={isPending || !productId || !customerEmail || groupNames.length === 0}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Выдать доступ
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
