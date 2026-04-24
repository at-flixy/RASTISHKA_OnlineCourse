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
