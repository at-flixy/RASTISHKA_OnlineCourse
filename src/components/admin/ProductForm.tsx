"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { ImageUpload } from "@/components/admin/ImageUpload";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tariffSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Обязательно"),
  tagline: z.string().optional(),
  priceKgs: z.number().int().nonnegative("Укажите цену"),
  priceUsd: z.number().int().nonnegative("Укажите цену"),
  durationLabel: z.string().min(1, "Обязательно"),
  includes: z.array(z.object({ value: z.string() })),
  getcourseGroupName: z.string().min(1, "Обязательно"),
  order: z.number().int(),
});

const productSchema = z.object({
  slug: z
    .string()
    .min(1, "Обязательно")
    .regex(/^[a-z0-9-]+$/, "Только строчные буквы, цифры и дефис"),
  title: z.string().min(1, "Обязательно"),
  shortDescription: z.string().min(1, "Обязательно"),
  longDescription: z.string(),
  thumbnailUrl: z.string().optional(),
  durationLabel: z.string().optional(),
  priceKgs: z.number().int().nonnegative().optional().nullable(),
  priceUsd: z.number().int().nonnegative().optional().nullable(),
  getcourseGroupName: z.string().optional(),
  ctaTitle: z.string().optional(),
  ctaSubtitle: z.string().optional(),
  ctaFeatures: z.array(z.object({ value: z.string() })),
  ctaButtonLabel: z.string().optional(),
  isPublished: z.boolean(),
  tariffs: z.array(tariffSchema),
});

type ProductFormValues = z.infer<typeof productSchema>;

type InitialProduct = {
  id?: string;
  slug: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  thumbnailUrl?: string | null;
  durationLabel?: string | null;
  priceKgs?: number | null;
  priceUsd?: number | null;
  getcourseGroupName?: string | null;
  ctaTitle?: string | null;
  ctaSubtitle?: string | null;
  ctaFeatures?: string[];
  ctaButtonLabel?: string | null;
  isPublished: boolean;
  tariffs: {
    id?: string;
    name: string;
    tagline?: string | null;
    priceKgs: number;
    priceUsd: number;
    durationLabel: string;
    includes: string[];
    getcourseGroupName: string;
    order: number;
  }[];
};

interface ProductFormProps {
  product?: InitialProduct;
  isNew?: boolean;
}

export function ProductForm({ product, isNew = false }: ProductFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTariff, setExpandedTariff] = useState<number | null>(isNew ? null : null);

  const defaultValues: ProductFormValues = {
    slug: product?.slug ?? "",
    title: product?.title ?? "",
    shortDescription: product?.shortDescription ?? "",
    longDescription: product?.longDescription ?? "",
    thumbnailUrl: product?.thumbnailUrl ?? "",
    durationLabel: product?.durationLabel ?? "",
    priceKgs: product?.priceKgs ?? null,
    priceUsd: product?.priceUsd ?? null,
    getcourseGroupName: product?.getcourseGroupName ?? "",
    ctaTitle: product?.ctaTitle ?? "",
    ctaSubtitle: product?.ctaSubtitle ?? "",
    ctaFeatures: (product?.ctaFeatures ?? []).map((v) => ({ value: v })),
    ctaButtonLabel: product?.ctaButtonLabel ?? "",
    isPublished: product?.isPublished ?? false,
    tariffs: (product?.tariffs ?? []).map((t) => ({
      ...t,
      tagline: t.tagline ?? "",
      includes: t.includes.map((v) => ({ value: v })),
    })),
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });

  const { fields: tariffFields, append, remove, move } = useFieldArray({
    control,
    name: "tariffs",
  });

  const {
    fields: ctaFeatureFields,
    append: appendCtaFeature,
    remove: removeCtaFeature,
  } = useFieldArray({
    control,
    name: "ctaFeatures",
  });

  const hasTariffs = tariffFields.length > 0;

  const onSubmit = async (values: ProductFormValues) => {
    setIsSaving(true);
    setError(null);

    const payload = {
      ...values,
      thumbnailUrl: values.thumbnailUrl || null,
      durationLabel: values.durationLabel || null,
      getcourseGroupName: values.getcourseGroupName || null,
      ctaTitle: values.ctaTitle || null,
      ctaSubtitle: values.ctaSubtitle || null,
      ctaButtonLabel: values.ctaButtonLabel || null,
      ctaFeatures: values.ctaFeatures.map((f) => f.value).filter(Boolean),
      tariffs: values.tariffs.map((t, i) => ({
        ...t,
        tagline: t.tagline || null,
        includes: t.includes.map((inc) => inc.value).filter(Boolean),
        order: i,
      })),
    };

    try {
      let res: Response;
      if (isNew) {
        res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/admin/products/${product!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const fieldErrors = data?.error?.fieldErrors
          ? Object.entries(data.error.fieldErrors)
              .map(([field, msgs]) => `${field}: ${(msgs as string[])[0]}`)
              .join("; ")
          : null;
        setError(
          fieldErrors ||
            data?.error?.formErrors?.[0] ||
            (typeof data?.error === "string" ? data.error : null) ||
            `Ошибка ${res.status}`
        );
        return;
      }

      router.push("/admin/products");
      router.refresh();
    } catch {
      setError("Ошибка соединения");
    } finally {
      setIsSaving(false);
    }
  };

  const addTariff = () => {
    append({
      name: "",
      tagline: "",
      priceKgs: 0,
      priceUsd: 0,
      durationLabel: "3 месяца",
      includes: [{ value: "" }],
      getcourseGroupName: "",
      order: tariffFields.length,
    });
    setExpandedTariff(tariffFields.length);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Основная информация</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Название *</Label>
              <Input id="title" {...register("title")} placeholder="Массаж для особенных детей" />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug (URL) *</Label>
              <Input
                id="slug"
                {...register("slug")}
                placeholder="massazh-osobennye-deti"
                className="font-mono"
              />
              {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="shortDescription">Краткое описание *</Label>
            <Textarea
              id="shortDescription"
              {...register("shortDescription")}
              placeholder="Для карточки курса (1-2 предложения)"
              rows={2}
            />
            {errors.shortDescription && (
              <p className="text-xs text-destructive">{errors.shortDescription.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Полное описание</Label>
            <RichTextEditor
              value={watch("longDescription") ?? ""}
              onChange={(v) => setValue("longDescription", v)}
              placeholder="Подробное описание курса..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Обложка курса</Label>
              <ImageUpload
                value={watch("thumbnailUrl") ?? ""}
                onChange={(url) => setValue("thumbnailUrl", url)}
                aspect="product"
                label="Обложка курса"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="durationLabel">Длительность доступа</Label>
              <Input
                id="durationLabel"
                {...register("durationLabel")}
                placeholder="3 месяца"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="isPublished"
              checked={watch("isPublished")}
              onCheckedChange={(v) => setValue("isPublished", v)}
            />
            <Label htmlFor="isPublished" className="cursor-pointer">
              Опубликован на сайте
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Pricing (only if no tariffs) */}
      {!hasTariffs && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Цена и GetCourse</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="priceKgs">Цена (KGS, тыйын)</Label>
                <Input
                  id="priceKgs"
                  {...register("priceKgs", { valueAsNumber: true })}
                  type="number"
                  placeholder="99000"
                />
                <p className="text-xs text-muted-foreground">В тиынах (1 с = 100 тыйын)</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="priceUsd">Цена (USD, центы)</Label>
                <Input
                  id="priceUsd"
                  {...register("priceUsd", { valueAsNumber: true })}
                  type="number"
                  placeholder="11500"
                />
                <p className="text-xs text-muted-foreground">В центах (1 $ = 100 cent)</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="getcourseGroupName">Группа в GetCourse</Label>
                <Input
                  id="getcourseGroupName"
                  {...register("getcourseGroupName")}
                  placeholder="Название группы"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tariffs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            Тарифы{" "}
            {hasTariffs && (
              <span className="text-muted-foreground font-normal text-sm">
                ({tariffFields.length})
              </span>
            )}
          </CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addTariff}>
            <Plus className="h-4 w-4 mr-1" />
            Добавить тариф
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasTariffs && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Нет тарифов — используется единая цена выше
            </p>
          )}

          {tariffFields.map((field, index) => (
            <TariffEditor
              key={field.id}
              index={index}
              isExpanded={expandedTariff === index}
              onToggle={() => setExpandedTariff(expandedTariff === index ? null : index)}
              onRemove={() => remove(index)}
              onMoveUp={() => { if (index > 0) move(index, index - 1); }}
              onMoveDown={() => { if (index < tariffFields.length - 1) move(index, index + 1); }}
              register={register}
              watch={watch}
              setValue={setValue}
              errors={errors}
              control={control}
              isFirst={index === 0}
              isLast={index === tariffFields.length - 1}
            />
          ))}
        </CardContent>
      </Card>

      {/* CTA block */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">CTA-блок «Готовы начать?»</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Отображается на странице курса под описанием для курсов без тарифов. Оставьте поля пустыми, чтобы использовать значения по умолчанию.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ctaTitle">Заголовок</Label>
              <Input
                id="ctaTitle"
                {...register("ctaTitle")}
                placeholder="Готовы начать?"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ctaButtonLabel">Текст кнопки</Label>
              <Input
                id="ctaButtonLabel"
                {...register("ctaButtonLabel")}
                placeholder="Записаться за 6 900 с"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ctaSubtitle">Подзаголовок</Label>
            <Input
              id="ctaSubtitle"
              {...register("ctaSubtitle")}
              placeholder="Доступ открывается сразу после оплаты через GetCourse"
            />
          </div>

          <div className="space-y-2">
            <Label>Пункты блока</Label>
            {ctaFeatureFields.map((field, idx) => (
              <div key={field.id} className="flex gap-2">
                <Input
                  {...register(`ctaFeatures.${idx}.value`)}
                  placeholder="Видеоуроки в удобном формате"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCtaFeature(idx)}
                  className="text-destructive hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendCtaFeature({ value: "" })}
            >
              <Plus className="h-4 w-4 mr-1" />
              Добавить пункт
            </Button>
            <p className="text-xs text-muted-foreground">
              Если оставить пустым, будут показаны пункты по умолчанию (видеоуроки, доступ, методические материалы, поддержка куратора).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/products")}
        >
          Отмена
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isNew ? "Создать продукт" : "Сохранить изменения"}
        </Button>
      </div>
    </form>
  );
}

// Inline tariff editor component
function TariffEditor({
  index,
  isExpanded,
  onToggle,
  onRemove,
  onMoveUp,
  onMoveDown,
  register,
  watch,
  setValue,
  errors,
  control,
  isFirst,
  isLast,
}: {
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watch: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { fields: includeFields, append: addInclude, remove: removeInclude } = useFieldArray({
    control,
    name: `tariffs.${index}.includes`,
  });

  const name = watch(`tariffs.${index}.name`);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 bg-muted/30 cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-sm font-medium">
          {name || `Тариф ${index + 1}`}
        </span>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onMoveUp}
            disabled={isFirst}
            className="h-7 w-7 p-0"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onMoveDown}
            disabled={isLast}
            className="h-7 w-7 p-0"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            isExpanded && "rotate-180"
          )}
        />
      </div>

      {/* Body */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Название тарифа *</Label>
              <Input
                {...register(`tariffs.${index}.name`)}
                placeholder="Базовый"
              />
              {errors.tariffs?.[index]?.name && (
                <p className="text-xs text-destructive">{errors.tariffs[index].name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Подзаголовок</Label>
              <Input
                {...register(`tariffs.${index}.tagline`)}
                placeholder="Для тех, кто начинает с нуля"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Цена KGS (тыйын) *</Label>
              <Input
                {...register(`tariffs.${index}.priceKgs`, { valueAsNumber: true })}
                type="number"
                placeholder="990000"
              />
              {errors.tariffs?.[index]?.priceKgs && (
                <p className="text-xs text-destructive">{errors.tariffs[index].priceKgs.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Цена USD (центы) *</Label>
              <Input
                {...register(`tariffs.${index}.priceUsd`, { valueAsNumber: true })}
                type="number"
                placeholder="11500"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Длительность *</Label>
              <Input
                {...register(`tariffs.${index}.durationLabel`)}
                placeholder="3 месяца"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Группа в GetCourse *</Label>
            <Input
              {...register(`tariffs.${index}.getcourseGroupName`)}
              placeholder="Название группы в GetCourse"
            />
            {errors.tariffs?.[index]?.getcourseGroupName && (
              <p className="text-xs text-destructive">
                {errors.tariffs[index].getcourseGroupName.message}
              </p>
            )}
          </div>

          {/* Includes */}
          <div className="space-y-2">
            <Label>Что входит в тариф</Label>
            {includeFields.map((includeField, iIdx) => (
              <div key={includeField.id} className="flex gap-2">
                <Input
                  {...register(`tariffs.${index}.includes.${iIdx}.value`)}
                  placeholder="✔ Видеоуроки"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeInclude(iIdx)}
                  className="text-destructive hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addInclude({ value: "" })}
            >
              <Plus className="h-4 w-4 mr-1" />
              Добавить пункт
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
