-- CreateType
CREATE TYPE "QuoteStatus" AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'revision_requested');

-- CreateTable
CREATE TABLE "quote_counters" (
    "id" UUID NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "quote_counters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quotes" (
    "id" UUID NOT NULL,
    "quote_number" TEXT NOT NULL,
    "partner_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'draft',
    "objet" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tva_amount" DECIMAL(12,2) NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "converted_to_invoice_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quote_lines" (
    "id" UUID NOT NULL,
    "quote_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit_price" DECIMAL(12,3) NOT NULL,
    "line_total" DECIMAL(12,2) NOT NULL,
    CONSTRAINT "quote_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quotes_quote_number_key" ON "quotes"("quote_number");
CREATE UNIQUE INDEX "quotes_converted_to_invoice_id_key" ON "quotes"("converted_to_invoice_id");
CREATE INDEX "quotes_partner_id_idx" ON "quotes"("partner_id");
CREATE INDEX "quotes_created_by_user_id_idx" ON "quotes"("created_by_user_id");
CREATE INDEX "quote_lines_quote_id_idx" ON "quote_lines"("quote_id");

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "quote_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "invoices_quote_id_key" ON "invoices"("quote_id");

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_converted_to_invoice_id_fkey" FOREIGN KEY ("converted_to_invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropEnumValue: 'devis' from InvoiceStatus — flip existing rows then rebuild the type
UPDATE "invoices" SET "status" = 'draft' WHERE "status"::text = 'devis';

ALTER TYPE "InvoiceStatus" RENAME TO "InvoiceStatus_old";
CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'issued', 'partially_paid', 'paid', 'overdue');
ALTER TABLE "invoices" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "invoices" ALTER COLUMN "status" TYPE "InvoiceStatus" USING ("status"::text)::"InvoiceStatus";
ALTER TABLE "invoices" ALTER COLUMN "status" SET DEFAULT 'draft';
DROP TYPE "InvoiceStatus_old";