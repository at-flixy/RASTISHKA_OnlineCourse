"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle } from "lucide-react";

const schema = z.object({
  hero: z.object({
    badge: z.string(),
    titleLine1: z.string(),
    titleHighlight: z.string(),
    titleLine2: z.string(),
    description: z.string(),
    ctaButton: z.string(),
    whatsappButton: z.string(),
  }),
  stats: z.array(z.object({ value: z.string(), label: z.string() })).length(4),
  courses: z.object({ title: z.string(), subtitle: z.string() }),
  about: z.object({
    title: z.string(),
    bio: z.string(),
    linkText: z.string(),
    cards: z.array(z.object({ title: z.string(), desc: z.string() })).length(4),
  }),
  gift: z.object({ title: z.string(), subtitle: z.string(), button: z.string() }),
});

type FormValues = z.infer<typeof schema>;

const DEFAULTS: FormValues = {
  hero: {
    badge: "Детский массаж онлайн",
    titleLine1: "Массаж, который",
    titleHighlight: "меняет жизнь",
    titleLine2: "ребёнка",
    description:
      "Онлайн-курсы для родителей и специалистов от реабилитолога с опытом 10+ лет. Работаю с детьми с РАС, ЗПРР, СДВГ. Системный подход через тело и нервную систему.",
    ctaButton: "Смотреть курсы",
    whatsappButton: "Написать в WhatsApp",
  },
  stats: [
    { value: "10+", label: "лет опыта" },
    { value: "500+", label: "учеников" },
    { value: "6", label: "курсов" },
    { value: "100%", label: "онлайн" },
  ],
  courses: {
    title: "Курсы и материалы",
    subtitle: "Системные знания по детскому массажу — от базового до углублённого",
  },
  about: {
    title: "Кто ведёт курсы?",
    bio: "Светлана Масалова — реабилитолог, специалист по детскому массажу с опытом работы более 10 лет. Бишкек, Кыргызстан.\n\nСпециализируется на работе с особенными детьми: РАС, ЗПРР, СДВГ, ДЦП. Помогает родителям понять, как через массаж влиять на состояние нервной системы ребёнка.\n\nСоздала систему онлайн-курсов, чтобы дать знания семьям, где нет доступа к специалисту рядом.",
    linkText: "Подробнее обо мне →",
    cards: [
      { title: "Реабилитолог", desc: "Профессиональная подготовка и сертификаты" },
      { title: "Педагог", desc: "Умею объяснять сложное простыми словами" },
      { title: "10+ лет", desc: "Практического опыта с особенными детьми" },
      { title: "500+ учеников", desc: "Из России, Казахстана, Кыргызстана" },
    ],
  },
  gift: {
    title: "Подарите знания близким",
    subtitle: "Подарочный сертификат на любой курс — идеальный подарок для молодых родителей",
    button: "Оформить сертификат",
  },
};

interface Props {
  initialData: FormValues | null;
}

export function LandingContentForm({ initialData }: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialData ?? DEFAULTS,
  });

  const { fields: statFields } = useFieldArray({ control, name: "stats" });
  const { fields: cardFields } = useFieldArray({ control, name: "about.cards" });

  const onSubmit = async (values: FormValues) => {
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/landing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) { setError("Ошибка сохранения"); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Ошибка соединения");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      {/* ── Hero ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Хиро-блок (первый экран)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Бейдж (маленький текст над заголовком)</Label>
            <Input {...register("hero.badge")} placeholder="Детский массаж онлайн" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Заголовок — строка 1</Label>
              <Input {...register("hero.titleLine1")} placeholder="Массаж, который" />
            </div>
            <div className="space-y-1.5">
              <Label>Заголовок — выделение (фиолетовый)</Label>
              <Input {...register("hero.titleHighlight")} placeholder="меняет жизнь" />
            </div>
            <div className="space-y-1.5">
              <Label>Заголовок — строка 3</Label>
              <Input {...register("hero.titleLine2")} placeholder="ребёнка" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Описание</Label>
            <Textarea {...register("hero.description")} rows={3} placeholder="Описание под заголовком" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

      {/* ── Stats ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Блок статистики (фиолетовая полоса)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {statFields.map((field, i) => (
              <div key={field.id} className="space-y-2">
                <div className="space-y-1.5">
                  <Label>Значение {i + 1}</Label>
                  <Input {...register(`stats.${i}.value`)} placeholder="10+" />
                </div>
                <div className="space-y-1.5">
                  <Label>Подпись {i + 1}</Label>
                  <Input {...register(`stats.${i}.label`)} placeholder="лет опыта" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Courses section ── */}
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
            <Input {...register("courses.subtitle")} placeholder="Системные знания по детскому массажу..." />
          </div>
        </CardContent>
      </Card>

      {/* ── About ── */}
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
            <p className="text-xs text-muted-foreground">Разделяйте абзацы пустой строкой (Enter дважды)</p>
            <Textarea {...register("about.bio")} rows={6} placeholder="Светлана Масалова — реабилитолог..." />
          </div>

          <div className="space-y-1.5">
            <Label>Текст ссылки «Обо мне»</Label>
            <Input {...register("about.linkText")} placeholder="Подробнее обо мне →" />
          </div>

          <div className="space-y-2">
            <Label>Карточки (4 штуки)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {cardFields.map((field, i) => (
                <div key={field.id} className="border rounded-lg p-3 space-y-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Заголовок карточки {i + 1}</Label>
                    <Input {...register(`about.cards.${i}.title`)} placeholder="Реабилитолог" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Описание карточки {i + 1}</Label>
                    <Input {...register(`about.cards.${i}.desc`)} placeholder="Профессиональная подготовка" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Gift CTA ── */}
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
            <Input {...register("gift.subtitle")} placeholder="Подарочный сертификат на любой курс..." />
          </div>
          <div className="space-y-1.5">
            <Label>Текст кнопки</Label>
            <Input {...register("gift.button")} placeholder="Оформить сертификат" />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end items-center pb-6">
        {saved && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <CheckCircle className="h-4 w-4" />
            Сохранено
          </span>
        )}
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Сохранить контент
        </Button>
      </div>
    </form>
  );
}
