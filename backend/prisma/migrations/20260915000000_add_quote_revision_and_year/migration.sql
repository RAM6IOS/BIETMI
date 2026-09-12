-- AlterTable: QuoteCounter gains a year dimension for `QT-YYYY-XXXXX` numbering
ALTER TABLE "quote_counters" ADD COLUMN "year" INTEGER;

UPDATE "quote_counters"
SET "year" = COALESCE(
  (SELECT EXTRACT(YEAR FROM MAX("created_at"))::int FROM "quotes"),
  2026
)
WHERE "year" IS NULL;

ALTER TABLE "quote_counters" ALTER COLUMN "year" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "quote_counters_year_key" ON "quote_counters"("year");

-- Backfill existing quote numbers into the `QT-YYYY-XXXXX` format
UPDATE "quotes"
SET "quote_number" =
  'QT-' || EXTRACT(YEAR FROM "created_at")::text || '-' || lpad("quote_number", 5, '0')
WHERE "quote_number" !~ '^QT-';

-- AlterTable: Quote gains supersedesQuoteId (self-referential FK)
ALTER TABLE "quotes" ADD COLUMN "supersedes_quote_id" UUID;

-- CreateIndex
CREATE INDEX "quotes_supersedes_quote_id_idx" ON "quotes"("supersedes_quote_id");

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_supersedes_quote_id_fkey"
  FOREIGN KEY ("supersedes_quote_id") REFERENCES "quotes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;