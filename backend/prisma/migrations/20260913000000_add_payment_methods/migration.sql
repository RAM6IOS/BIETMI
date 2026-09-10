-- Add payment_methods (JSONB) to all three documents, backfilling from the
-- legacy payment_modalities text column (as a single 100% line), then drop it.

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "payment_methods" JSONB;

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN "payment_methods" JSONB;

-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN "payment_methods" JSONB;

-- Backfill existing payment modalities as a single structured line at 100%
UPDATE "invoices" SET "payment_methods" =
  jsonb_build_array(jsonb_build_object('label', "payment_modalities", 'percentage', 100))
WHERE "payment_modalities" IS NOT NULL AND "payment_methods" IS NULL;

UPDATE "quotes" SET "payment_methods" =
  jsonb_build_array(jsonb_build_object('label', "payment_modalities", 'percentage', 100))
WHERE "payment_modalities" IS NOT NULL AND "payment_methods" IS NULL;

UPDATE "purchase_orders" SET "payment_methods" =
  jsonb_build_array(jsonb_build_object('label', "payment_modalities", 'percentage', 100))
WHERE "payment_modalities" IS NOT NULL AND "payment_methods" IS NULL;

-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "payment_modalities";

-- AlterTable
ALTER TABLE "quotes" DROP COLUMN "payment_modalities";

-- AlterTable
ALTER TABLE "purchase_orders" DROP COLUMN "payment_modalities";