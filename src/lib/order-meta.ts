export const orderStatusLabels: Record<string, string> = {
  PENDING: "Ожидание",
  PAID: "Оплачен",
  FAILED: "Ошибка",
  REFUNDED: "Возврат",
};

export const orderStatusVariants: Record<
  string,
  "default" | "success" | "destructive" | "secondary" | "warning" | "outline"
> = {
  PENDING: "warning",
  PAID: "success",
  FAILED: "destructive",
  REFUNDED: "secondary",
};

export const syncStatusLabels: Record<string, string> = {
  PENDING: "Ожидает",
  SUCCESS: "Синхр.",
  FAILED: "Ошибка",
};

export const syncStatusVariants: Record<
  string,
  "default" | "success" | "destructive" | "secondary" | "warning" | "outline"
> = {
  PENDING: "secondary",
  SUCCESS: "success",
  FAILED: "destructive",
};

export const purchaseTypeLabels: Record<string, string> = {
  COURSE: "Курс",
  GIFT_CERTIFICATE: "Подарочный сертификат",
};

export function formatMoney(amount: number, currency: string) {
  return `${(amount / 100).toLocaleString("ru-RU")} ${currency}`;
}
