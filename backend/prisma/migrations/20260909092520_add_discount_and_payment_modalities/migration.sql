-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "payment_modalities" TEXT;

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "payment_modalities" TEXT;
