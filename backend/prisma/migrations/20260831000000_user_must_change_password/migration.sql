-- User management — REQ-503/504
-- REQ-501→505: add must_change_password column for first-login password change enforcement.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT true;
