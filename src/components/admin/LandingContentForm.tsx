"use client";

import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createDefaultLandingContent,
  landingContentSchema,
  type LandingContent,
} from "@/lib/landing-content";

interface Props {
  initialData: LandingContent | null;
}

export function LandingContentForm({ initialData }: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, control, watch, setValue } = useForm<LandingContent>({
    resolver: zodResolver(landingContentSchema),
    defaultValues: initialData ?? createDefaultLandingContent(),
  });

  const { fields: statFields } = useFieldArray({ control, name: "stats" });
  const { fields: cardFields } = useFieldArray({ control, name: "about.cards" });
  const {
    fields: reviewFields,
    append: appendReview,
    move: moveReview,
    remove: removeReview,
  } = useFieldArray({
    control,
    name: "reviews.items",
  });

  const onSubmit = async (values: LandingContent) => {
    setIsSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/admin/landing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        setError("Ошибка сохранения");
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Ошибка соединения");
    } finally {
      setIsSaving(false);
    }
  };

  const addReview = () => {
    appendReview({
      name: "",
      source: "",
      description: "",
      alt: "",
      imageUrl: "",
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Хиро-блок (первый экран)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Бейдж (маленький текст над заголовком)</Label>
            <Input {...register("hero.badge")} placeholder="Детский массаж онлайн" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Заголовок — строка 1</Label>
              <Input {...register("hero.titleLine1")} placeholder="Массаж, который" />
            </div>
            <div className="space-y-1.5">
              <Label>Заголовок — выделение</Label>
              <Input {...register("hero.titleHighlight")} placeholder="меняет жизнь" />
            </div>
            <div className="space-y-1.5">
              <Label>Заголовок — строка 3</Label>
              <Input {...register("hero.titleLine2")} placeholder="ребёнка" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Описание</Label>
            <Textarea
              {...register("hero.description")}
              rows={3}
              placeholder="Описание под заголовком"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Кнопка «Смотреть курсы»</Label>
              <Input {...register("hero.ctaButton")} placeholder="Смотреть курсы" />
            </div>
            <div className="space-y-1.5">
              <Label>Кнопка WhatsApp</Label>
              <Input {...register("hero.whatsappButton")} placeholder="Написать в WhatsApp" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Блок статистики</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {statFields.map((field, index) => (
              <div key={field.id} className="space-y-2">
                <div className="space-y-1.5">
                  <Label>Значение {index + 1}</Label>
                  <Input {...register(`stats.${index}.value`)} placeholder="10+" />
                </div>
                <div className="space-y-1.5">
                  <Label>Подпись {index + 1}</Label>
                  <Input {...register(`stats.${index}.label`)} placeholder="лет опыта" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Раздел курсов</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Заголовок раздела</Label>
            <Input {...register("courses.title")} placeholder="Курсы и материалы" />
          </div>
          <div className="space-y-1.5">
            <Label>Подзаголовок</Label>
            <Input
              {...register("courses.subtitle")}
              placeholder="Системные знания по детскому массажу..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Блок «Отзывы и истории учеников»</CardTitle>
          <p className="text-sm text-muted-foreground">
            Добавляйте скриншоты переписок, фотоотчётов и короткие подписи. Порядок здесь
            сохраняется на главной странице.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label>Заголовок</Label>
            <Input
              {...register("reviews.title")}
              placeholder="Отзывы и истории учеников"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Подзаголовок</Label>
            <Textarea
              {...register("reviews.subtitle")}
              rows={2}
              placeholder="Живые фотоотчёты и переписки из соцсетей"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Отзывов в блоке: {reviewFields.length}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addReview}>
              <Plus className="mr-1 h-4 w-4" />
              Добавить отзыв
            </Button>
          </div>

          {reviewFields.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
              Пока нет ни одного отзыва. Нажмите «Добавить отзыв», загрузите скриншот и заполните подпись.
            </div>
          )}

          <div className="space-y-4">
            {reviewFields.map((field, index) => {
              const name = watch(`reviews.items.${index}.name`);
              const imageUrl = watch(`reviews.items.${index}.imageUrl`);

              return (
                <div
                  key={field.id}
                  className="rounded-2xl border border-border bg-muted/20 p-4"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">
                        {name || `Отзыв ${index + 1}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Скриншот переписки или фотоотчёта
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => index > 0 && moveReview(index, index - 1)}
                        disabled={index === 0}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => index < reviewFields.length - 1 && moveReview(index, index + 1)}
                        disabled={index === reviewFields.length - 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeReview(index)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[240px_1fr]">
                    <div className="space-y-1.5">
                      <Label>Изображение</Label>
                      <ImageUpload
                        value={imageUrl ?? ""}
                        onChange={(url) =>
                          setValue(`reviews.items.${index}.imageUrl`, url, {
                            shouldDirty: true,
                          })
                        }
                        aspect="story"
                        label={name || `Отзыв ${index + 1}`}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label>Имя / заголовок</Label>
                          <Input
                            {...register(`reviews.items.${index}.name`)}
                            placeholder="Например, Алина М."
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label>Источник / подпись</Label>
                          <Input
                            {...register(`reviews.items.${index}.source`)}
                            placeholder="WhatsApp, Instagram, Telegram"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Короткое описание</Label>
                        <Textarea
                          {...register(`reviews.items.${index}.description`)}
                          rows={3}
                          placeholder="Например, краткий результат или пояснение к фотоотчёту"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Alt для изображения</Label>
                        <Input
                          {...register(`reviews.items.${index}.alt`)}
                          placeholder="Скриншот отзыва ученика"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Блок «Кто ведёт курсы?»</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Заголовок</Label>
            <Input {...register("about.title")} placeholder="Кто ведёт курсы?" />
          </div>

          <div className="space-y-1.5">
            <Label>Биография</Label>
            <p className="text-xs text-muted-foreground">
              Разделяйте абзацы пустой строкой (Enter дважды)
            </p>
            <Textarea
              {...register("about.bio")}
              rows={6}
              placeholder="Светлана Масалова — реабилитолог..."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Текст ссылки «Обо мне»</Label>
            <Input {...register("about.linkText")} placeholder="Подробнее обо мне →" />
          </div>

          <div className="space-y-2">
            <Label>Карточки (4 штуки)</Label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {cardFields.map((field, index) => (
                <div key={field.id} className="space-y-2 rounded-lg border p-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Заголовок карточки {index + 1}</Label>
                    <Input
                      {...register(`about.cards.${index}.title`)}
                      placeholder="Реабилитолог"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Описание карточки {index + 1}</Label>
                    <Input
                      {...register(`about.cards.${index}.desc`)}
                      placeholder="Профессиональная подготовка"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Блок «Подарочный сертификат»</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Заголовок</Label>
            <Input {...register("gift.title")} placeholder="Подарите знания близким" />
          </div>
          <div className="space-y-1.5">
            <Label>Подзаголовок</Label>
            <Input
              {...register("gift.subtitle")}
              placeholder="Подарочный сертификат на любой курс..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Текст кнопки</Label>
            <Input {...register("gift.button")} placeholder="Оформить сертификат" />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3 pb-6">
        {saved && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            Сохранено
          </span>
        )}
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Сохранить контент
        </Button>
      </div>
    </form>
  );
}
