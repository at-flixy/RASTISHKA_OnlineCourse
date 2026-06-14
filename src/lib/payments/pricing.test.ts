import assert from "node:assert/strict";
import test from "node:test";
import { calculatePercentDiscount, normalizePromoCode } from "@/lib/payments/pricing";

test("normalizePromoCode trims and uppercases codes", () => {
  assert.equal(normalizePromoCode(" massage10 "), "MASSAGE10");
  assert.equal(normalizePromoCode(""), null);
  assert.equal(normalizePromoCode(null), null);
});

test("calculatePercentDiscount rounds percentage discounts", () => {
  assert.equal(calculatePercentDiscount(6900, 10), 690);
  assert.equal(calculatePercentDiscount(999, 15), 150);
});

test("calculatePercentDiscount supports 100 percent without exceeding subtotal", () => {
  assert.equal(calculatePercentDiscount(6900, 100), 6900);
  assert.equal(calculatePercentDiscount(6900, 150), 6900);
});

test("calculatePercentDiscount ignores zero and negative inputs", () => {
  assert.equal(calculatePercentDiscount(6900, 0), 0);
  assert.equal(calculatePercentDiscount(6900, -10), 0);
  assert.equal(calculatePercentDiscount(0, 50), 0);
});
