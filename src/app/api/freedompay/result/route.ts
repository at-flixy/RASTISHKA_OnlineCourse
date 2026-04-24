import { logIntegrationEvent } from "@/lib/integration-log";
import {
  buildFreedomPayResultResponse,
  freedomPayFormDataToPayload,
  getFreedomPayErrorMessage,
  processFreedomPayResultCallback,
  verifyFreedomPaySignature,
} from "@/lib/payments/freedompay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function xmlResponse(xml: string) {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
    status: 200,
  });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const payload = freedomPayFormDataToPayload(formData);
  const orderId = payload.pg_order_id ?? undefined;

  if (!verifyFreedomPaySignature("result", payload)) {
    const message = "Invalid Freedom Pay signature";

    await logIntegrationEvent({
      source: "freedompay",
      event: "result-callback",
      orderId,
      requestBody: payload,
      error: message,
      status: "FAILED",
    });

    return xmlResponse(
      buildFreedomPayResultResponse({
        description: message,
        status: "error",
      })
    );
  }

  try {
    const result = await processFreedomPayResultCallback(payload);

    await logIntegrationEvent({
      source: "freedompay",
      event: "result-callback",
      orderId: result.orderId,
      requestBody: payload,
      responseBody: result,
      status: "SUCCESS",
    });

    return xmlResponse(
      buildFreedomPayResultResponse({
        description: result.finalStatus === "PAID" ? "Order paid" : result.message,
        status: "ok",
      })
    );
  } catch (error) {
    const message = getFreedomPayErrorMessage(error);

    await logIntegrationEvent({
      source: "freedompay",
      event: "result-callback",
      orderId,
      requestBody: payload,
      error: message,
      status: "FAILED",
    });

    return xmlResponse(
      buildFreedomPayResultResponse({
        description: message,
        status: "error",
      })
    );
  }
}
