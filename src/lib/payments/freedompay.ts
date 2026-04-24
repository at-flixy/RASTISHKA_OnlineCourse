import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { logIntegrationEvent } from "@/lib/integration-log";
import { fulfillPaidOrder } from "@/lib/payments/fulfillment";
import { getSiteUrl } from "@/lib/site-url";

const FREEDOMPAY_INIT_PAYMENT_URL = "https://api.freedompay.kz/init_payment";
const FREEDOMPAY_STATUS_URL = "https://api.freedompay.kz/get_status3.php";

type FreedomPayPrimitive = string | number | boolean;
type FreedomPayValue =
  | FreedomPayPrimitive
  | FreedomPayValue[]
  | {
      [key: string]: FreedomPayValue;
    };

type FreedomPaySignaturePayload = Record<string, FreedomPayValue | null | undefined>;

export type FreedomPayCallbackPayload = Record<string, string>;

type FreedomPayTransitionResult = {
  changed: boolean;
  finalStatus: string;
  message: string;
  orderId: string;
  providerOrderId: string | null;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

export function getFreedomPayMerchantId() {
  return getRequiredEnv("FREEDOMPAY_MERCHANT_ID");
}

function getFreedomPaySecretKey() {
  return getRequiredEnv("FREEDOMPAY_SECRET_KEY");
}

function normalizeFreedomPayScriptName(scriptName: string) {
  const cleanScriptName = scriptName.split("?")[0];
  const segments = cleanScriptName.split("/");

  return segments[segments.length - 1] || cleanScriptName;
}

export function generateFreedomPaySalt(length = 16) {
  return randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
}

function appendFreedomPaySignatureValue(values: string[], value: FreedomPayValue) {
  if (Array.isArray(value)) {
    for (const item of value) {
      appendFreedomPaySignatureValue(values, item);
    }

    return;
  }

  if (value && typeof value === "object") {
    for (const key of Object.keys(value).sort()) {
      const nestedValue = value[key];

      if (nestedValue == null) {
        continue;
      }

      appendFreedomPaySignatureValue(values, nestedValue);
    }

    return;
  }

  values.push(String(value));
}

function getFreedomPaySignatureValues(payload: FreedomPaySignaturePayload) {
  const values: string[] = [];

  for (const key of Object.keys(payload).sort()) {
    if (key === "pg_sig") {
      continue;
    }

    const value = payload[key];

    if (value == null) {
      continue;
    }

    appendFreedomPaySignatureValue(values, value);
  }

  return values;
}

export function signFreedomPayPayload(
  scriptName: string,
  payload: FreedomPaySignaturePayload,
  secretKey = getFreedomPaySecretKey()
) {
  return createHash("md5")
    .update(
      [normalizeFreedomPayScriptName(scriptName), ...getFreedomPaySignatureValues(payload), secretKey].join(
        ";"
      )
    )
    .digest("hex");
}

export function verifyFreedomPaySignature(
  scriptName: string,
  payload: FreedomPaySignaturePayload,
  secretKey = getFreedomPaySecretKey()
) {
  const signature = typeof payload.pg_sig === "string" ? payload.pg_sig.toLowerCase() : "";

  if (!signature) {
    return false;
  }

  return signFreedomPayPayload(scriptName, payload, secretKey) === signature;
}

function withFreedomPaySignature(
  scriptName: string,
  payload: Record<string, string>,
  secretKey?: string
) {
  return {
    ...payload,
    pg_sig: signFreedomPayPayload(scriptName, payload, secretKey),
  };
}

function formatFreedomPayAmount(amount: number) {
  return (amount / 100).toFixed(2);
}

function decodeXmlEntities(value: string) {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

function getXmlTagValue(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));

  return match ? decodeXmlEntities(match[1].trim()) : null;
}

function parseFreedomPayXmlPayload(xml: string, fields: string[]) {
  const payload: Record<string, string> = {};

  for (const field of fields) {
    const value = getXmlTagValue(xml, field);

    if (value != null) {
      payload[field] = value;
    }
  }

  return payload;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function getFreedomPayStatusMessage(payload: FreedomPayCallbackPayload) {
  return (
    payload.pg_error_description ??
    payload.pg_description ??
    payload.pg_payment_status ??
    payload.pg_status ??
    "Freedom Pay reported an unsuccessful payment"
  );
}

function normalizeFreedomPayPaymentState(payload: FreedomPayCallbackPayload) {
  if ((payload.pg_status ?? "").toLowerCase() !== "ok") {
    throw new Error(
      payload.pg_error_description ??
        `Freedom Pay status request failed with ${payload.pg_status ?? "empty status"}`
    );
  }

  const paymentStatus = (payload.pg_payment_status ?? "").toLowerCase();

  if (paymentStatus === "ok" || paymentStatus === "success") {
    return {
      message: "Freedom Pay confirmed the payment",
      state: "PAID" as const,
    };
  }

  if (
    paymentStatus === "error" ||
    paymentStatus === "failed" ||
    paymentStatus === "incomplete" ||
    paymentStatus === "rejected" ||
    paymentStatus === "cancelled" ||
    paymentStatus === "canceled" ||
    paymentStatus === "expired"
  ) {
    return {
      message: getFreedomPayStatusMessage(payload),
      state: "FAILED" as const,
    };
  }

  return {
    message: paymentStatus ? `Freedom Pay status is ${paymentStatus}` : "Freedom Pay status is pending",
    state: "PENDING" as const,
  };
}

function assertFreedomPayResponseSignature(scriptName: string, payload: FreedomPayCallbackPayload) {
  if (!verifyFreedomPaySignature(scriptName, payload)) {
    throw new Error(`Invalid Freedom Pay signature for ${normalizeFreedomPayScriptName(scriptName)} response`);
  }
}

async function loadFreedomPayOrder(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      paidAt: true,
      paidCurrency: true,
      provider: true,
      providerOrderId: true,
      status: true,
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.provider !== "FREEDOMPAY") {
    throw new Error("Order is not attached to Freedom Pay");
  }

  return order;
}

async function markFreedomPayOrderPaid(input: {
  orderId: string;
  paidCurrency?: string | null;
  providerOrderId?: string | null;
}) {
  const order = await loadFreedomPayOrder(input.orderId);

  if (order.status === "PAID") {
    return {
      changed: false,
      finalStatus: order.status,
      message: "Order already paid",
      orderId: order.id,
      providerOrderId: input.providerOrderId ?? order.providerOrderId ?? null,
    };
  }

  const updateResult = await db.order.updateMany({
    where: {
      id: order.id,
      provider: "FREEDOMPAY",
      status: {
        in: ["PENDING", "FAILED"],
      },
    },
    data: {
      status: "PAID",
      paidAt: order.paidAt ?? new Date(),
      paidCurrency: input.paidCurrency ?? order.paidCurrency,
      providerOrderId: input.providerOrderId ?? order.providerOrderId,
      syncError: null,
    },
  });

  if (updateResult.count > 0) {
    await fulfillPaidOrder(order.id);

    return {
      changed: true,
      finalStatus: "PAID",
      message: "Payment confirmed",
      orderId: order.id,
      providerOrderId: input.providerOrderId ?? order.providerOrderId ?? null,
    };
  }

  const refreshedOrder = await loadFreedomPayOrder(order.id);

  return {
    changed: false,
    finalStatus: refreshedOrder.status,
    message: "Order status was updated in parallel",
    orderId: refreshedOrder.id,
    providerOrderId: input.providerOrderId ?? refreshedOrder.providerOrderId ?? null,
  };
}

async function markFreedomPayOrderFailed(input: {
  orderId: string;
  message: string;
  providerOrderId?: string | null;
}) {
  const order = await loadFreedomPayOrder(input.orderId);

  if (order.status === "PAID") {
    return {
      changed: false,
      finalStatus: order.status,
      message: "Order already paid",
      orderId: order.id,
      providerOrderId: input.providerOrderId ?? order.providerOrderId ?? null,
    };
  }

  const updateResult = await db.order.updateMany({
    where: {
      id: order.id,
      provider: "FREEDOMPAY",
      status: "PENDING",
    },
    data: {
      status: "FAILED",
      providerOrderId: input.providerOrderId ?? order.providerOrderId,
      syncError: input.message,
    },
  });

  if (updateResult.count > 0) {
    return {
      changed: true,
      finalStatus: "FAILED",
      message: input.message,
      orderId: order.id,
      providerOrderId: input.providerOrderId ?? order.providerOrderId ?? null,
    };
  }

  const refreshedOrder = await loadFreedomPayOrder(order.id);

  return {
    changed: false,
    finalStatus: refreshedOrder.status,
    message: refreshedOrder.status === "FAILED" ? input.message : "Order status was updated in parallel",
    orderId: refreshedOrder.id,
    providerOrderId: input.providerOrderId ?? refreshedOrder.providerOrderId ?? null,
  };
}

export async function createFreedomPayPayment(input: {
  amount: number;
  currency: string;
  customerEmail: string;
  customerPhone?: string | null;
  description: string;
  orderId: string;
}) {
  const siteUrl = getSiteUrl();
  const basePayload = {
    pg_amount: formatFreedomPayAmount(input.amount),
    pg_currency: input.currency,
    pg_description: input.description,
    pg_failure_url: `${siteUrl}/checkout/cancel?order=${input.orderId}`,
    pg_failure_url_method: "GET",
    pg_merchant_id: getFreedomPayMerchantId(),
    pg_order_id: input.orderId,
    pg_request_method: "POST",
    pg_result_url: `${siteUrl}/api/freedompay/result`,
    pg_salt: generateFreedomPaySalt(),
    pg_success_url: `${siteUrl}/checkout/success?order=${input.orderId}`,
    pg_success_url_method: "GET",
    merchant_order_id: input.orderId,
    ...(input.customerEmail ? { pg_user_contact_email: input.customerEmail } : {}),
    ...(input.customerPhone ? { pg_user_phone: input.customerPhone } : {}),
  };
  const requestPayload = withFreedomPaySignature("init_payment", basePayload);
  const response = await fetch(FREEDOMPAY_INIT_PAYMENT_URL, {
    body: JSON.stringify(requestPayload),
    cache: "no-store",
    headers: {
      Accept: "application/xml",
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const rawXml = await response.text();

  if (!response.ok) {
    throw new Error(`Freedom Pay init_payment returned HTTP ${response.status}`);
  }

  const responsePayload = parseFreedomPayXmlPayload(rawXml, [
    "pg_status",
    "pg_payment_id",
    "pg_redirect_url",
    "pg_redirect_url_type",
    "pg_redirect_qr",
    "pg_error_code",
    "pg_error_description",
    "pg_salt",
    "pg_sig",
  ]);

  assertFreedomPayResponseSignature("init_payment", responsePayload);

  if ((responsePayload.pg_status ?? "").toLowerCase() !== "ok") {
    throw new Error(
      responsePayload.pg_error_description ??
        `Freedom Pay init_payment failed with ${responsePayload.pg_status ?? "empty status"}`
    );
  }

  if (!responsePayload.pg_payment_id || !responsePayload.pg_redirect_url) {
    throw new Error("Freedom Pay init_payment response is missing pg_payment_id or pg_redirect_url");
  }

  return {
    rawXml,
    requestPayload,
    responsePayload,
  };
}

export function freedomPayFormDataToPayload(formData: FormData) {
  const payload: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    payload[key] = typeof value === "string" ? value : value.name;
  }

  return payload;
}

export async function processFreedomPayResultCallback(payload: FreedomPayCallbackPayload) {
  const orderId = payload.pg_order_id;

  if (!orderId) {
    throw new Error("Freedom Pay callback is missing pg_order_id");
  }

  const providerOrderId = payload.pg_payment_id ?? null;

  if (payload.pg_result === "1") {
    return markFreedomPayOrderPaid({
      orderId,
      paidCurrency: payload.pg_currency ?? null,
      providerOrderId,
    });
  }

  return markFreedomPayOrderFailed({
    message: getFreedomPayStatusMessage(payload),
    orderId,
    providerOrderId,
  });
}

export function buildFreedomPayResultResponse(input: {
  description: string;
  secretKey?: string;
  salt?: string;
  status: "error" | "ok";
}) {
  const basePayload = {
    pg_description: input.description,
    pg_salt: input.salt ?? generateFreedomPaySalt(),
    pg_status: input.status,
  };
  const signature = signFreedomPayPayload("result", basePayload, input.secretKey);

  return `<?xml version="1.0" encoding="utf-8"?>
<response>
    <pg_status>${escapeXml(basePayload.pg_status)}</pg_status>
    <pg_description>${escapeXml(basePayload.pg_description)}</pg_description>
    <pg_salt>${escapeXml(basePayload.pg_salt)}</pg_salt>
    <pg_sig>${escapeXml(signature)}</pg_sig>
</response>`;
}

async function getFreedomPayStatus(input: { orderId: string; providerOrderId: string }) {
  const basePayload = {
    pg_merchant_id: getFreedomPayMerchantId(),
    pg_order_id: input.orderId,
    pg_payment_id: input.providerOrderId,
    pg_salt: generateFreedomPaySalt(),
  };
  const requestPayload = withFreedomPaySignature("get_status3.php", basePayload);
  const response = await fetch(FREEDOMPAY_STATUS_URL, {
    body: new URLSearchParams(requestPayload),
    cache: "no-store",
    headers: {
      Accept: "application/xml",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    method: "POST",
  });
  const rawXml = await response.text();

  if (!response.ok) {
    throw new Error(`Freedom Pay get_status3.php returned HTTP ${response.status}`);
  }

  const responsePayload = parseFreedomPayXmlPayload(rawXml, [
    "pg_status",
    "pg_payment_id",
    "pg_can_reject",
    "pg_payment_method",
    "pg_amount",
    "pg_currency",
    "pg_payment_status",
    "pg_clearing_amount",
    "pg_reference",
    "pg_refund_amount",
    "pg_captured",
    "pg_create_date",
    "pg_error_code",
    "pg_error_description",
    "pg_salt",
    "pg_sig",
  ]);

  assertFreedomPayResponseSignature("get_status3.php", responsePayload);

  return {
    rawXml,
    requestPayload,
    responsePayload,
  };
}

export async function reconcileFreedomPayOrderStatus(orderId: string): Promise<FreedomPayTransitionResult> {
  const order = await loadFreedomPayOrder(orderId);

  if (order.status !== "PENDING") {
    return {
      changed: false,
      finalStatus: order.status,
      message: "Order is already in a final state",
      orderId: order.id,
      providerOrderId: order.providerOrderId ?? null,
    };
  }

  if (!order.providerOrderId) {
    return {
      changed: false,
      finalStatus: order.status,
      message: "Freedom Pay payment id is missing",
      orderId: order.id,
      providerOrderId: null,
    };
  }

  try {
    const statusResponse = await getFreedomPayStatus({
      orderId: order.id,
      providerOrderId: order.providerOrderId,
    });
    const normalized = normalizeFreedomPayPaymentState(statusResponse.responsePayload);
    const transitionResult =
      normalized.state === "PAID"
        ? await markFreedomPayOrderPaid({
            orderId: order.id,
            paidCurrency: statusResponse.responsePayload.pg_currency ?? order.paidCurrency,
            providerOrderId: statusResponse.responsePayload.pg_payment_id ?? order.providerOrderId,
          })
        : normalized.state === "FAILED"
        ? await markFreedomPayOrderFailed({
            message: normalized.message,
            orderId: order.id,
            providerOrderId: statusResponse.responsePayload.pg_payment_id ?? order.providerOrderId,
          })
        : {
            changed: false,
            finalStatus: order.status,
            message: normalized.message,
            orderId: order.id,
            providerOrderId: statusResponse.responsePayload.pg_payment_id ?? order.providerOrderId,
          };

    await logIntegrationEvent({
      source: "freedompay",
      event: "status-sync",
      orderId: order.id,
      requestBody: statusResponse.requestPayload,
      responseBody: {
        response: statusResponse.responsePayload,
        transition: transitionResult,
      },
      status: "SUCCESS",
    });

    return transitionResult;
  } catch (error) {
    const message = getErrorMessage(error);

    await logIntegrationEvent({
      source: "freedompay",
      event: "status-sync",
      orderId: order.id,
      requestBody: {
        orderId: order.id,
        providerOrderId: order.providerOrderId,
      },
      error: message,
      status: "FAILED",
    });

    return {
      changed: false,
      finalStatus: order.status,
      message,
      orderId: order.id,
      providerOrderId: order.providerOrderId,
    };
  }
}

export function getFreedomPayErrorMessage(error: unknown) {
  return getErrorMessage(error);
}

export function mapFreedomPayPaymentStatus(payload: FreedomPayCallbackPayload) {
  return normalizeFreedomPayPaymentState(payload);
}
