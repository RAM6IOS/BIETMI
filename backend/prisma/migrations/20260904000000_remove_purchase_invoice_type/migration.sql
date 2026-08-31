-- Remove purchase invoice type: sales-only invoicing.
-- Purchase requests are handled by the dedicated purchase orders module.

-- 1. Delete any leftover purchase data (lines, counters, invoices) before
--    dropping the column, so no orphaned sale-looking invoices remain.
DELETE FROM "invoice_lines"
WHERE "invoice_id" IN (SELECT "id" FROM "invoices" WHERE "type" = 'purchase');

DELETE FROM "invoice_counters" WHERE "type" = 'purchase';

DELETE FROM "invoices" WHERE "type" = 'purchase';

-- 2. Drop the type columns. Dropping "invoice_counters"."type" also drops the
--    composite unique index on ("type", "year").
ALTER TABLE "invoices" DROP COLUMN "type";

ALTER TABLE "invoice_counters" DROP COLUMN "type";

-- 3. Invoice numbering is now unique per year only.
CREATE UNIQUE INDEX "invoice_counters_year_key" ON "invoice_counters"("year");

-- 4. The enum is no longer referenced by any column.
DROP TYPE "InvoiceType";