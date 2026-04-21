ALTER TYPE "PaymentProvider" ADD VALUE 'STRIPE';

CREATE TYPE "PurchaseType" AS ENUM ('COURSE', 'GIFT_CERTIFICATE');

ALTER TABLE "Order"
ADD COLUMN "giftRecipientEmail" TEXT,
ADD COLUMN "paidCurrency" TEXT,
ADD COLUMN "purchaseType" "PurchaseType" NOT NULL DEFAULT 'COURSE',
ADD COLUMN "stripeCheckoutSessionId" TEXT,
ADD COLUMN "stripePaymentIntentId" TEXT,
ADD COLUMN "customerEmailSentAt" TIMESTAMP(3),
ADD COLUMN "recipientEmailSentAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Order_stripeCheckoutSessionId_key" ON "Order"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX "Order_stripePaymentIntentId_key" ON "Order"("stripePaymentIntentId");

ALTER TABLE "GiftCertificate"
ADD COLUMN "amount" INTEGER,
ADD COLUMN "currency" TEXT,
ADD COLUMN "tariffId" TEXT;

ALTER TABLE "GiftCertificate"
ALTER COLUMN "amountKgs" DROP NOT NULL;

UPDATE "GiftCertificate"
SET "amount" = "amountKgs",
    "currency" = 'KGS'
WHERE "amount" IS NULL;

ALTER TABLE "GiftCertificate"
ALTER COLUMN "amount" SET NOT NULL,
ALTER COLUMN "currency" SET NOT NULL;

CREATE UNIQUE INDEX "GiftCertificate_orderId_key" ON "GiftCertificate"("orderId");
