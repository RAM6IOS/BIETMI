-- Sprint 2: Unify customers -> partners (Partner model with type/currency/paymentTerms)
-- IMPORTANT: source UUIDs are preserved verbatim so that child tables (contacts,
-- invoices, contracts) can be relinked via partner_id = customer_id.

-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('customer', 'supplier');
CREATE TYPE "PartnerCurrency" AS ENUM ('DZD', 'FOREIGN');

-- CreateTable partners
CREATE TABLE "partners" (
    "id" UUID NOT NULL,
    "type" "PartnerType" NOT NULL DEFAULT 'customer',
    "name" TEXT NOT NULL,
    "commercial_register" TEXT,
    "nif" TEXT,
    "address" TEXT,
    "payment_terms" TEXT,
    "currency" "PartnerCurrency" NOT NULL DEFAULT 'DZD',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- Migrate existing rows preserving the original UUID in "id" (no regeneration)
INSERT INTO "partners" (
    "id", "type", "name", "commercial_register", "nif", "address",
    "payment_terms", "currency", "is_active", "created_at", "updated_at"
)
SELECT
    "id", 'customer', "name", "commercial_register", "nif", "address",
    NULL, 'DZD', "is_active", "created_at", "updated_at"
FROM "customers";

-- Relink contacts (preserving the UUID link via partner_id = customer_id)
ALTER TABLE "contacts" ADD COLUMN "partner_id" UUID;
UPDATE "contacts" SET "partner_id" = "customer_id";
ALTER TABLE "contacts" DROP CONSTRAINT "contacts_customer_id_fkey";
ALTER TABLE "contacts" DROP COLUMN "customer_id";
ALTER TABLE "contacts" ALTER COLUMN "partner_id" SET NOT NULL;
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Relink invoices
ALTER TABLE "invoices" ADD COLUMN "partner_id" UUID;
UPDATE "invoices" SET "partner_id" = "customer_id";
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_customer_id_fkey";
ALTER TABLE "invoices" DROP COLUMN "customer_id";
ALTER TABLE "invoices" ALTER COLUMN "partner_id" SET NOT NULL;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Relink contracts
ALTER TABLE "contracts" ADD COLUMN "partner_id" UUID;
UPDATE "contracts" SET "partner_id" = "customer_id";
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_customer_id_fkey";
ALTER TABLE "contracts" DROP COLUMN "customer_id";
ALTER TABLE "contracts" ALTER COLUMN "partner_id" SET NOT NULL;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Unique index + drop legacy table
CREATE UNIQUE INDEX "partners_nif_key" ON "partners"("nif");
DROP TABLE "customers";
