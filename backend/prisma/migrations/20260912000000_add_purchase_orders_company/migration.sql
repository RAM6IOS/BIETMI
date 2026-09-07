-- Reconcile schema.prisma with the migration history.
-- Adds the PurchaseOrder module, Company model and columns that had been
-- applied via prisma db push during development but were never captured
-- in a migration. Removes quote indexes not declared in the schema.

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('draft', 'sent');

-- DropIndex
DROP INDEX "quote_lines_quote_id_idx";

-- DropIndex
DROP INDEX "quotes_created_by_user_id_idx";

-- DropIndex
DROP INDEX "quotes_partner_id_idx";

-- AlterTable
ALTER TABLE "invoice_lines" ADD COLUMN     "unit" TEXT;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "objet" TEXT;

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" UUID NOT NULL,
    "order_number" TEXT NOT NULL,
    "supplier_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "order_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'draft',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tva_amount" DECIMAL(12,2) NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_lines" (
    "id" UUID NOT NULL,
    "purchase_order_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit_price" DECIMAL(12,3) NOT NULL,
    "line_total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "purchase_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_counters" (
    "id" UUID NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "purchase_order_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT,
    "siege_social" TEXT,
    "ville" TEXT,
    "mobile" TEXT,
    "tel_fax" TEXT,
    "rc" TEXT,
    "nif" TEXT,
    "ain" TEXT,
    "banque_baraka" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_order_number_key" ON "purchase_orders"("order_number");

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;