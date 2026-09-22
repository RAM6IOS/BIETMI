-- Scope the company profile per workspace.
-- Each root account gets its own company identity (name, address, RC, NIF,
-- bank details) instead of sharing a single global row.
-- The existing row is preserved as the 'production' profile.

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "workspace" "Workspace" NOT NULL DEFAULT 'production';

-- CreateIndex
CREATE UNIQUE INDEX "companies_workspace_key" ON "companies"("workspace");
