"use client";

import { startTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function PendingOrderRefresh() {
  const router = useRouter();

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      startTransition(() => {
        router.refresh();
      });
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [router]);

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        startTransition(() => {
          router.refresh();
        });
      }}
    >
      Обновить статус
    </Button>
  );
}
