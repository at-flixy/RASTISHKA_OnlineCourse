import { db } from "@/lib/db";

type IntegrationLogInput = {
  source: string;
  event: string;
  orderId?: string | null;
  status: string;
  error?: string | null;
  requestBody?: unknown;
  responseBody?: unknown;
};

function serializePayload(payload: unknown) {
  if (payload == null) {
    return null;
  }

  if (typeof payload === "string") {
    return payload;
  }

  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
}

export async function logIntegrationEvent(input: IntegrationLogInput) {
  try {
    await db.integrationLog.create({
      data: {
        source: input.source,
        event: input.event,
        orderId: input.orderId ?? null,
        status: input.status,
        error: input.error ?? null,
        requestBody: serializePayload(input.requestBody),
        responseBody: serializePayload(input.responseBody),
      },
    });
  } catch (error) {
    console.error("Failed to store integration log", error);
  }
}
