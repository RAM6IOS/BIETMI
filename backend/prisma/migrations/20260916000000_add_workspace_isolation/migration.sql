-- CreateEnum
CREATE TYPE "Workspace" AS ENUM ('production', 'sandbox');

-- DropIndex
DROP INDEX "invoice_counters_year_key";

-- DropIndex
DROP INDEX "invoices_invoice_number_key";

-- DropIndex
DROP INDEX "partners_nif_key";

-- DropIndex
DROP INDEX "purchase_orders_order_number_key";

-- DropIndex
DROP INDEX "quote_counters_year_key";

-- DropIndex
DROP INDEX "quotes_quote_number_key";

-- DropIndex
DROP INDEX "supplier_categories_name_key";

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "workspace" "Workspace" NOT NULL DEFAULT 'production';

-- AlterTable
ALTER TABLE "invoice_counters" ADD COLUMN     "workspace" "Workspace" NOT NULL DEFAULT 'production';

-- AlterTable
ALTER TABLE "invoice_lines" ADD COLUMN     "workspace" "Workspace" NOT NULL DEFAULT 'production';

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "workspace" "Workspace" NOT NULL DEFAULT 'production';

-- AlterTable
ALTER TABLE "partners" ADD COLUMN     "workspace" "Workspace" NOT NULL DEFAULT 'production';

-- AlterTable
ALTER TABLE "purchase_order_counters" ADD COLUMN     "workspace" "Workspace" NOT NULL DEFAULT 'production';

-- AlterTable
ALTER TABLE "purchase_order_lines" ADD COLUMN     "workspace" "Workspace" NOT NULL DEFAULT 'production';

-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "workspace" "Workspace" NOT NULL DEFAULT 'production';

-- AlterTable
ALTER TABLE "quote_counters" ADD COLUMN     "workspace" "Workspace" NOT NULL DEFAULT 'production';

-- AlterTable
ALTER TABLE "quote_lines" ADD COLUMN     "workspace" "Workspace" NOT NULL DEFAULT 'production';

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "workspace" "Workspace" NOT NULL DEFAULT 'production';

-- AlterTable
ALTER TABLE "supplier_categories" ADD COLUMN     "workspace" "Workspace" NOT NULL DEFAULT 'production';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "workspace" "Workspace" NOT NULL DEFAULT 'production';

-- ============================================================
-- Data backfill — APPROVED decision (2026-09-16):
-- All existing MIXED data (created by both test & real accounts)
-- is classified as 'sandbox' by default (safest — mostly test data).
-- Real records will be manually re-classified to 'production' afterwards.
-- User accounts get explicit per-account classification:
--   dev_test      -> sandbox
--   admin_bietmi  -> production
-- ============================================================

UPDATE "contacts"            SET "workspace" = 'sandbox';
UPDATE "invoice_counters"    SET "workspace" = 'sandbox';
UPDATE "invoice_lines"       SET "workspace" = 'sandbox';
UPDATE "invoices"            SET "workspace" = 'sandbox';
UPDATE "partners"            SET "workspace" = 'sandbox';
UPDATE "purchase_order_counters" SET "workspace" = 'sandbox';
UPDATE "purchase_order_lines"    SET "workspace" = 'sandbox';
UPDATE "purchase_orders"         SET "workspace" = 'sandbox';
UPDATE "quote_counters"          SET "workspace" = 'sandbox';
UPDATE "quote_lines"             SET "workspace" = 'sandbox';
UPDATE "quotes"                  SET "workspace" = 'sandbox';
UPDATE "supplier_categories"     SET "workspace" = 'sandbox';

UPDATE "users" SET "workspace" = 'sandbox'   WHERE "username" = 'dev_test';
UPDATE "users" SET "workspace" = 'production' WHERE "username" = 'admin_bietmi';

-- CreateIndex
CREATE UNIQUE INDEX "invoice_counters_workspace_year_key" ON "invoice_counters"("workspace", "year");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_workspace_invoice_number_key" ON "invoices"("workspace", "invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "partners_workspace_nif_key" ON "partners"("workspace", "nif");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_counters_workspace_key" ON "purchase_order_counters"("workspace");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_workspace_order_number_key" ON "purchase_orders"("workspace", "order_number");

-- CreateIndex
CREATE UNIQUE INDEX "quote_counters_workspace_year_key" ON "quote_counters"("workspace", "year");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_workspace_quote_number_key" ON "quotes"("workspace", "quote_number");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_categories_workspace_name_key" ON "supplier_categories"("workspace", "name");