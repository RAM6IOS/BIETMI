-- CreateTable
CREATE TABLE "supplier_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PartnerToSupplierCategory" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_PartnerToSupplierCategory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_categories_name_key" ON "supplier_categories"("name");

-- CreateIndex
CREATE INDEX "_PartnerToSupplierCategory_B_index" ON "_PartnerToSupplierCategory"("B");

-- AddForeignKey
ALTER TABLE "_PartnerToSupplierCategory" ADD CONSTRAINT "_PartnerToSupplierCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PartnerToSupplierCategory" ADD CONSTRAINT "_PartnerToSupplierCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "supplier_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;