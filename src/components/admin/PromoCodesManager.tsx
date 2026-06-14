"use client";

import { useMemo, useState, type FormEvent } from "react";
import { BadgePercent, Pencil, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type ProductOption = {
  id: string;
  title: string;
};

type PromoCodeRow = {
  _count: {
    redemptions: number;
  };
  appliesToAllProducts: boolean;
  code: string;
  createdAt: string;
  description: string | null;
  endsAt: string | null;
  id: string;
  isActive: boolean;
  maxRedemptions: number | null;
  perCustomerLimit: number | null;
  percentOff: number;
  productScopes: Array<{
    product: ProductOption;
    productId: string;
  }>;
  startsAt: string | null;
};

type PromoCodesManagerProps = {
  initialPromoCodes: PromoCodeRow[];
  products: ProductOption[];
};

type PromoCodeFormState = {
  appliesToAllProducts: boolean;
  code: string;
  description: string;
  endsAt: string;
  isActive: boolean;
  maxRedemptions: string;
  perCustomerLimit: string;
  percentOff: string;
  productIds: string[];
  startsAt: string;
};

const emptyForm: PromoCodeFormState = {
  appliesToAllProducts: false,
  code: "",
  description: "",
  endsAt: "",
  isActive: true,
  maxRedemptions: "",
  perCustomerLimit: "",
  percentOff: "10",
  productIds: [],
  startsAt: "",
};

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 16);
}

function toApiDate(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("ru-RU") : "—";
}

export function PromoCodesManager({ initialPromoCodes, products }: PromoCodesManagerProps) {
  const [promoCodes, setPromoCodes] = useState(initialPromoCodes);
  const [form, setForm] = useState<PromoCodeFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const selectedProductsText = useMemo(() => {
    if (form.appliesToAllProducts) {
      return "Все курсы";
    }

    return form.productIds.length > 0 ? `Выбрано: ${form.productIds.length}` : "Курсы не выбраны";
  }, [form.appliesToAllProducts, form.productIds.length]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError(null);
  };

  const updateForm = <Key extends keyof PromoCodeFormState>(
    key: Key,
    value: PromoCodeFormState[Key]
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleProduct = (productId: string) => {
    setForm((current) => {
      const selected = new Set(current.productIds);

      if (selected.has(productId)) {
        selected.delete(productId);
      } else {
        selected.add(productId);
      }

      return { ...current, productIds: Array.from(selected) };
    });
  };

  const editPromoCode = (promoCode: PromoCodeRow) => {
    setEditingId(promoCode.id);
    setError(null);
    setForm({
      appliesToAllProducts: promoCode.appliesToAllProducts,
      code: promoCode.code,
      description: promoCode.description ?? "",
      endsAt: toDateTimeLocal(promoCode.endsAt),
      isActive: promoCode.isActive,
      maxRedemptions: promoCode.maxRedemptions?.toString() ?? "",
      perCustomerLimit: promoCode.perCustomerLimit?.toString() ?? "",
      percentOff: promoCode.percentOff.toString(),
      productIds: promoCode.productScopes.map((scope) => scope.productId),
      startsAt: toDateTimeLocal(promoCode.startsAt),
    });
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const payload = {
        appliesToAllProducts: form.appliesToAllProducts,
        code: form.code,
        description: form.description || null,
        endsAt: toApiDate(form.endsAt),
        isActive: form.isActive,
        maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
        perCustomerLimit: form.perCustomerLimit ? Number(form.perCustomerLimit) : null,
        percentOff: Number(form.percentOff),
        productIds: form.appliesToAllProducts ? [] : form.productIds,
        startsAt: toApiDate(form.startsAt),
      };
      const response = await fetch(editingId ? `/api/admin/promocodes/${editingId}` : "/api/admin/promocodes", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as PromoCodeRow & { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Не удалось сохранить промокод");
        return;
      }

      if (editingId) {
        setPromoCodes((current) => current.map((item) => (item.id === editingId ? data : item)));
      } else {
        setPromoCodes((current) => [data, ...current]);
      }

      resetForm();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось сохранить промокод");
    } finally {
      setIsPending(false);
    }
  };

  const deletePromoCode = async (id: string) => {
    if (!window.confirm("Удалить промокод? История применений связанных заказов останется в заказах.")) {
      return;
    }

    setError(null);
    const response = await fetch(`/api/admin/promocodes/${id}`, { method: "DELETE" });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Не удалось удалить промокод");
      return;
    }

    setPromoCodes((current) => current.filter((item) => item.id !== id));
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {editingId ? "Редактировать промокод" : "Новый промокод"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={submitForm}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="promoCode">Код</Label>
                <Input
                  id="promoCode"
                  value={form.code}
                  onChange={(event) => updateForm("code", event.target.value.toUpperCase())}
                  placeholder="MASSAGE10"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="percentOff">Скидка, %</Label>
                <Input
                  id="percentOff"
                  min={1}
                  max={100}
                  type="number"
                  value={form.percentOff}
                  onChange={(event) => updateForm("percentOff", event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="promoDescription">Описание</Label>
              <Textarea
                id="promoDescription"
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
                placeholder="Например, акция для сторис или конкретного запуска"
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startsAt">Начало</Label>
                <Input
                  id="startsAt"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(event) => updateForm("startsAt", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endsAt">Окончание</Label>
                <Input
                  id="endsAt"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(event) => updateForm("endsAt", event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxRedemptions">Общий лимит</Label>
                <Input
                  id="maxRedemptions"
                  min={1}
                  type="number"
                  value={form.maxRedemptions}
                  onChange={(event) => updateForm("maxRedemptions", event.target.value)}
                  placeholder="Без лимита"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="perCustomerLimit">Лимит на email</Label>
                <Input
                  id="perCustomerLimit"
                  min={1}
                  type="number"
                  value={form.perCustomerLimit}
                  onChange={(event) => updateForm("perCustomerLimit", event.target.value)}
                  placeholder="Без лимита"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label>Активен</Label>
                <p className="text-xs text-muted-foreground">Отключённый промокод нельзя применить.</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(value) => updateForm("isActive", value)} />
            </div>

            <div className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label>Курсы</Label>
                  <p className="text-xs text-muted-foreground">{selectedProductsText}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Все</span>
                  <Switch
                    checked={form.appliesToAllProducts}
                    onCheckedChange={(value) => updateForm("appliesToAllProducts", value)}
                  />
                </div>
              </div>

              {!form.appliesToAllProducts && (
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {products.map((product) => (
                    <label
                      key={product.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form.productIds.includes(product.id)}
                        onChange={() => toggleProduct(product.id)}
                      />
                      <span>{product.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isPending}>
                <BadgePercent className="h-4 w-4" />
                {isPending ? "Сохраняем..." : editingId ? "Сохранить" : "Создать"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  <X className="h-4 w-4" />
                  Отмена
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Все промокоды ({promoCodes.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {promoCodes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Промокодов пока нет</p>
          ) : (
            promoCodes.map((promoCode) => (
              <div key={promoCode.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-semibold">{promoCode.code}</span>
                      <Badge variant={promoCode.isActive ? "success" : "secondary"}>
                        {promoCode.isActive ? "Активен" : "Отключён"}
                      </Badge>
                      <Badge variant="outline">-{promoCode.percentOff}%</Badge>
                    </div>
                    {promoCode.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{promoCode.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => editPromoCode(promoCode)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => void deletePromoCode(promoCode.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">Курсы:</span>{" "}
                    {promoCode.appliesToAllProducts
                      ? "Все курсы"
                      : promoCode.productScopes.map((scope) => scope.product.title).join(", ") || "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Использований:</span>{" "}
                    {promoCode._count.redemptions}
                    {promoCode.maxRedemptions ? ` / ${promoCode.maxRedemptions}` : ""}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Начало:</span> {formatDate(promoCode.startsAt)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Окончание:</span> {formatDate(promoCode.endsAt)}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
