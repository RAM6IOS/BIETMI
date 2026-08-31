-- Remove Contracts (no longer needed)
DROP TABLE "contracts";
DROP TYPE "ContractType";
ALTER TABLE "invoices" DROP COLUMN "contract_id";