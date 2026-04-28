ALTER TABLE "Product"
ADD COLUMN "ctaTitle" TEXT,
ADD COLUMN "ctaSubtitle" TEXT,
ADD COLUMN "ctaFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "ctaButtonLabel" TEXT;
