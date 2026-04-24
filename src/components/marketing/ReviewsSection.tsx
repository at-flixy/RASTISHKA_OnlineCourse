"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { LandingReviewItem } from "@/lib/landing-content";

interface ReviewsSectionProps {
  title: string;
  subtitle: string;
  items: LandingReviewItem[];
}

export function ReviewsSection({
  title,
  subtitle,
  items,
}: ReviewsSectionProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const visibleItems = items.filter((item) => item.imageUrl.trim().length > 0);
  const selectedItem = selectedIndex !== null ? visibleItems[selectedIndex] : null;

  useEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }

    const syncScrollState = () => {
      const maxScrollLeft = list.scrollWidth - list.clientWidth;
      setCanScrollPrev(list.scrollLeft > 8);
      setCanScrollNext(maxScrollLeft - list.scrollLeft > 8);
    };

    syncScrollState();
    list.addEventListener("scroll", syncScrollState, { passive: true });
    window.addEventListener("resize", syncScrollState);

    return () => {
      list.removeEventListener("scroll", syncScrollState);
      window.removeEventListener("resize", syncScrollState);
    };
  }, [visibleItems.length]);

  if (visibleItems.length === 0) {
    return null;
  }

  const scrollByCard = (direction: -1 | 1) => {
    const list = listRef.current;
    if (!list) {
      return;
    }

    const card = list.querySelector<HTMLElement>("[data-review-card]");
    const cardWidth = card?.getBoundingClientRect().width ?? list.clientWidth * 0.85;
    list.scrollBy({
      left: direction * (cardWidth + 24),
      behavior: "smooth",
    });
  };

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f6f8ff_100%)] py-16 sm:py-20">
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.14),transparent_62%)] lg:block" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center rounded-full border border-primary/15 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary/80 shadow-sm">
              Фотоотчёты и переписки
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {title}
              </h2>
              <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => scrollByCard(-1)}
              disabled={!canScrollPrev}
              aria-label="Предыдущие отзывы"
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-white text-primary shadow-[0_14px_35px_rgba(15,23,42,0.08)] transition-all",
                canScrollPrev
                  ? "hover:-translate-y-0.5 hover:border-primary/20"
                  : "cursor-not-allowed text-primary/30 shadow-none"
              )}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollByCard(1)}
              disabled={!canScrollNext}
              aria-label="Следующие отзывы"
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-white text-primary shadow-[0_14px_35px_rgba(15,23,42,0.08)] transition-all",
                canScrollNext
                  ? "hover:-translate-y-0.5 hover:border-primary/20"
                  : "cursor-not-allowed text-primary/30 shadow-none"
              )}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div
          ref={listRef}
          className="hide-scrollbar mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2"
        >
          {visibleItems.map((item, index) => (
            <button
              key={`${item.imageUrl}-${index}`}
              type="button"
              data-review-card
              onClick={() => setSelectedIndex(index)}
              className="group relative w-[84vw] max-w-[380px] min-w-[84vw] shrink-0 snap-start rounded-[30px] border border-primary/15 bg-white/90 p-3 text-left shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur transition hover:-translate-y-1 sm:min-w-[340px] lg:min-w-[370px]"
              aria-label={`Открыть отзыв: ${item.name || `История ученика ${index + 1}`}`}
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-[24px] bg-slate-100">
                <Image
                  src={item.imageUrl}
                  alt={item.alt || item.name || `Отзыв ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 84vw, (max-width: 1024px) 42vw, 370px"
                  className="object-cover object-top transition duration-500 group-hover:scale-[1.015]"
                  unoptimized={item.imageUrl.startsWith("/api/media/")}
                />
                <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                  <Expand className="h-3.5 w-3.5" />
                  Открыть
                </div>
              </div>

              <div className="space-y-3 px-1 pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-foreground">
                      {item.name || `История ученика ${index + 1}`}
                    </p>
                    {item.description ? (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    ) : null}
                  </div>

                  {item.source ? (
                    <span className="shrink-0 rounded-full bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
                      {item.source}
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Dialog
        open={selectedIndex !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedIndex(null);
          }
        }}
      >
        {selectedItem ? (
          <DialogContent className="h-[92vh] w-[96vw] max-w-[min(96vw,1400px)] overflow-hidden border-white/10 bg-slate-950 p-0 text-white shadow-[0_40px_120px_rgba(0,0,0,0.55)] sm:rounded-2xl">
            <div className="grid h-full min-h-0 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="relative min-h-0 bg-black">
                <Image
                  src={selectedItem.imageUrl}
                  alt={selectedItem.alt || selectedItem.name || "Отзыв ученика"}
                  fill
                  sizes="96vw"
                  className="object-contain"
                  unoptimized={selectedItem.imageUrl.startsWith("/api/media/")}
                  priority
                />
              </div>

              <div className="flex min-h-0 flex-col border-t border-white/10 bg-slate-950/96 p-6 lg:border-l lg:border-t-0">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3 pr-10">
                    <DialogTitle className="text-2xl font-semibold text-white">
                      {selectedItem.name || `История ученика ${(selectedIndex ?? 0) + 1}`}
                    </DialogTitle>
                    {selectedItem.source ? (
                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                        {selectedItem.source}
                      </span>
                    ) : null}
                  </div>

                  <DialogDescription className="text-sm leading-relaxed text-white/70">
                    {selectedItem.description ||
                      "Полноэкранный просмотр отзыва. Нажмите Esc или кнопку закрытия, чтобы вернуться к списку."}
                  </DialogDescription>
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-white/70">
                  Отзыв открыт во весь экран. Закрыть можно по крестику в правом верхнем углу, кликом вне окна или клавишей Esc.
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 pt-6">
                  <span className="text-xs uppercase tracking-[0.22em] text-white/45">
                    {selectedIndex !== null ? `${selectedIndex + 1} / ${visibleItems.length}` : ""}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedIndex((current) =>
                          current === null ? null : (current - 1 + visibleItems.length) % visibleItems.length
                        )
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
                      aria-label="Предыдущий отзыв"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedIndex((current) =>
                          current === null ? null : (current + 1) % visibleItems.length
                        )
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
                      aria-label="Следующий отзыв"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </section>
  );
}
