import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  buildFreedomPayResultResponse,
  mapFreedomPayPaymentStatus,
  signFreedomPayPayload,
  verifyFreedomPaySignature,
} from "@/lib/payments/freedompay";

test("signFreedomPayPayload sorts fields alphabetically and excludes pg_sig", () => {
  const payload = {
    pg_amount: "25.00",
    pg_description: "Course payment",
    pg_merchant_id: "9001",
    pg_order_id: "order-123",
    pg_salt: "salt-1",
    pg_sig: "ignored",
  };

  const expected = createHash("md5")
    .update(
      ["init_payment", "25.00", "Course payment", "9001", "order-123", "salt-1", "secret"].join(";")
    )
    .digest("hex");

  assert.equal(signFreedomPayPayload("init_payment", payload, "secret"), expected);
});

test("verifyFreedomPaySignature validates signed payloads", () => {
  const unsignedPayload = {
    pg_amount: "25.00",
    pg_merchant_id: "9001",
    pg_order_id: "order-123",
    pg_salt: "salt-2",
  };
  const payload = {
    ...unsignedPayload,
    pg_sig: signFreedomPayPayload("get_status3.php", unsignedPayload, "secret"),
  };

  assert.equal(verifyFreedomPaySignature("get_status3.php", payload, "secret"), true);
  assert.equal(
    verifyFreedomPaySignature("get_status3.php", { ...payload, pg_sig: "broken" }, "secret"),
    false
  );
});

test("buildFreedomPayResultResponse returns signed XML", () => {
  const xml = buildFreedomPayResultResponse({
    description: "Order paid",
    salt: "salt-3",
    secretKey: "secret",
    status: "ok",
  });
  const payload = {
    pg_description: xml.match(/<pg_description>([\s\S]*?)<\/pg_description>/)?.[1] ?? "",
    pg_salt: xml.match(/<pg_salt>([\s\S]*?)<\/pg_salt>/)?.[1] ?? "",
    pg_sig: xml.match(/<pg_sig>([\s\S]*?)<\/pg_sig>/)?.[1] ?? "",
    pg_status: xml.match(/<pg_status>([\s\S]*?)<\/pg_status>/)?.[1] ?? "",
  };

  assert.match(xml, /<response>/);
  assert.equal(verifyFreedomPaySignature("result", payload, "secret"), true);
});

test("mapFreedomPayPaymentStatus maps gateway statuses", () => {
  assert.deepEqual(
    mapFreedomPayPaymentStatus({
      pg_payment_status: "ok",
      pg_status: "ok",
    }),
    {
      message: "Freedom Pay confirmed the payment",
      state: "PAID",
    }
  );

  assert.deepEqual(
    mapFreedomPayPaymentStatus({
      pg_payment_status: "success",
      pg_status: "ok",
    }),
    {
      message: "Freedom Pay confirmed the payment",
      state: "PAID",
    }
  );

  assert.deepEqual(
    mapFreedomPayPaymentStatus({
      pg_error_description: "Declined",
      pg_payment_status: "error",
      pg_status: "ok",
    }),
    {
      message: "Declined",
      state: "FAILED",
    }
  );

  assert.deepEqual(
    mapFreedomPayPaymentStatus({
      pg_payment_status: "incomplete",
      pg_status: "ok",
    }),
    {
      message: "incomplete",
      state: "FAILED",
    }
  );
});
