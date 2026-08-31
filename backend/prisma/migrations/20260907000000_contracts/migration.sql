-- Contracts (Sprint 3) — REQ-401→403
-- Sprint-1 stub was empty (0 rows) and nothing references it; replace per TDD §5.4.

-- DropTable
DROP TABLE "contracts";

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('sale', 'purchase');

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL,
    "contract_number" TEXT NOT NULL,
    "type" "ContractType" NOT NULL,
    "partner_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "total_value" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "project_id" UUID,
    "contract_type_detail" TEXT,
    "renewal_alert_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contracts_contract_number_key" ON "contracts"("contract_number");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;