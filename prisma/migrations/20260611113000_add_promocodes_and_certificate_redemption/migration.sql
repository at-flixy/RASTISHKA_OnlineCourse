ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'CERTIFICATE';

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "subtotalAmount" INTEGER;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "discountAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "promoCodeId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "promoCodeValue" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "promoPercentOff" INTEGER;

UPDATE "Order"
SET "subtotalAmount" = "amount"
WHERE "subtotalAmount" IS NULL;

ALTER TABLE "GiftCertificate" ADD COLUMN IF NOT EXISTS "redeemedByEmail" TEXT;
ALTER TABLE "GiftCertificate" ADD COLUMN IF NOT EXISTS "voidedAt" TIMESTAMP(3);
ALTER TABLE "GiftCertificate" ADD COLUMN IF NOT EXISTS "voidReason" TEXT;

CREATE TABLE IF NOT EXISTS "PromoCode" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "percentOff" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "maxRedemptions" INTEGER,
  "perCustomerLimit" INTEGER,
  "appliesToAllProducts" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PromoCodeProduct" (
  "id" TEXT NOT NULL,
  "promoCodeId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,

  CONSTRAINT "PromoCodeProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PromoRedemption" (
  "id" TEXT NOT NULL,
  "promoCodeId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "customerEmail" TEXT NOT NULL,
  "discountAmount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PromoRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PromoCode_code_key" ON "PromoCode"("code");
CREATE INDEX IF NOT EXISTS "PromoCode_isActive_idx" ON "PromoCode"("isActive");
CREATE INDEX IF NOT EXISTS "PromoCode_startsAt_idx" ON "PromoCode"("startsAt");
CREATE INDEX IF NOT EXISTS "PromoCode_endsAt_idx" ON "PromoCode"("endsAt");

CREATE UNIQUE INDEX IF NOT EXISTS "PromoCodeProduct_promoCodeId_productId_key" ON "PromoCodeProduct"("promoCodeId", "productId");
CREATE INDEX IF NOT EXISTS "PromoCodeProduct_productId_idx" ON "PromoCodeProduct"("productId");

CREATE UNIQUE INDEX IF NOT EXISTS "PromoRedemption_orderId_key" ON "PromoRedemption"("orderId");
CREATE INDEX IF NOT EXISTS "PromoRedemption_promoCodeId_idx" ON "PromoRedemption"("promoCodeId");
CREATE INDEX IF NOT EXISTS "PromoRedemption_customerEmail_idx" ON "PromoRedemption"("customerEmail");

CREATE INDEX IF NOT EXISTS "Order_promoCodeId_idx" ON "Order"("promoCodeId");
CREATE UNIQUE INDEX IF NOT EXISTS "GiftCertificate_redeemedOrderId_key" ON "GiftCertificate"("redeemedOrderId");
CREATE INDEX IF NOT EXISTS "GiftCertificate_productId_idx" ON "GiftCertificate"("productId");
CREATE INDEX IF NOT EXISTS "GiftCertificate_tariffId_idx" ON "GiftCertificate"("tariffId");
CREATE INDEX IF NOT EXISTS "GiftCertificate_recipientEmail_idx" ON "GiftCertificate"("recipientEmail");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Order_promoCodeId_fkey') THEN
    ALTER TABLE "Order" ADD CONSTRAINT "Order_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GiftCertificate_orderId_fkey') THEN
    ALTER TABLE "GiftCertificate" ADD CONSTRAINT "GiftCertificate_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GiftCertificate_productId_fkey') THEN
    ALTER TABLE "GiftCertificate" ADD CONSTRAINT "GiftCertificate_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GiftCertificate_tariffId_fkey') THEN
    ALTER TABLE "GiftCertificate" ADD CONSTRAINT "GiftCertificate_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "Tariff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GiftCertificate_redeemedOrderId_fkey') THEN
    ALTER TABLE "GiftCertificate" ADD CONSTRAINT "GiftCertificate_redeemedOrderId_fkey" FOREIGN KEY ("redeemedOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PromoCodeProduct_promoCodeId_fkey') THEN
    ALTER TABLE "PromoCodeProduct" ADD CONSTRAINT "PromoCodeProduct_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PromoCodeProduct_productId_fkey') THEN
    ALTER TABLE "PromoCodeProduct" ADD CONSTRAINT "PromoCodeProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PromoRedemption_promoCodeId_fkey') THEN
    ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PromoRedemption_orderId_fkey') THEN
    ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
