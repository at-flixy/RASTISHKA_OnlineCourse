import type { CheckoutProvider } from "@/lib/payments/catalog";

export const paymentProviderLabels: Record<CheckoutProvider, string> = {
  FREEDOMPAY: "Freedom Pay",
  STRIPE: "Stripe",
};

const enabledCheckoutProviders: CheckoutProvider[] = ["FREEDOMPAY"];

const paymentProviderEnvRequirements: Record<CheckoutProvider, string[]> = {
  FREEDOMPAY: ["FREEDOMPAY_MERCHANT_ID", "FREEDOMPAY_SECRET_KEY"],
  STRIPE: ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY"],
};

function hasRequiredEnv(name: string) {
  const value = process.env[name];

  return typeof value === "string" && value.trim().length > 0;
}

export function isPaymentProviderConfigured(provider: CheckoutProvider) {
  return paymentProviderEnvRequirements[provider].every(hasRequiredEnv);
}

export function getMissingPaymentProviderEnv(provider: CheckoutProvider) {
  return paymentProviderEnvRequirements[provider].filter((name) => !hasRequiredEnv(name));
}

export function getCheckoutProviderSetupIssue(provider: CheckoutProvider) {
  const missingEnv = getMissingPaymentProviderEnv(provider);

  if (missingEnv.length === 0) {
    return null;
  }

  return `Платежи через ${paymentProviderLabels[provider]} временно недоступны: не настроены ${missingEnv.join(
    ", "
  )}.`;
}

export function isCheckoutProviderAvailable(provider: CheckoutProvider) {
  return enabledCheckoutProviders.includes(provider) && isPaymentProviderConfigured(provider);
}

export function getAvailableCheckoutProviders() {
  return enabledCheckoutProviders.filter(isCheckoutProviderAvailable);
}

export function getPaymentProviderLabel(provider?: string | null) {
  if (provider === "FREEDOMPAY" || provider === "STRIPE") {
    return paymentProviderLabels[provider];
  }

  return provider ?? "Платёжный провайдер";
}
