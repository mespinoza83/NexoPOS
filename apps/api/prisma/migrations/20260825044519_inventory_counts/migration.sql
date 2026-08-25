-- CreateEnum
CREATE TYPE "InventoryCountStatus" AS ENUM ('APPROVED', 'VOIDED');

-- CreateTable
CREATE TABLE "InventoryCount" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "notes" TEXT,
    "status" "InventoryCountStatus" NOT NULL DEFAULT 'APPROVED',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),

    CONSTRAINT "InventoryCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCountItem" (
    "id" UUID NOT NULL,
    "inventoryCountId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "expectedQuantity" DECIMAL(14,3) NOT NULL,
    "countedQuantity" DECIMAL(14,3) NOT NULL,
    "difference" DECIMAL(14,3) NOT NULL,

    CONSTRAINT "InventoryCountItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryCount_branchId_createdAt_idx" ON "InventoryCount"("branchId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCount_branchId_number_key" ON "InventoryCount"("branchId", "number");

-- CreateIndex
CREATE INDEX "InventoryCountItem_productId_idx" ON "InventoryCountItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCountItem_inventoryCountId_productId_key" ON "InventoryCountItem"("inventoryCountId", "productId");

-- AddForeignKey
ALTER TABLE "InventoryCount" ADD CONSTRAINT "InventoryCount_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCountItem" ADD CONSTRAINT "InventoryCountItem_inventoryCountId_fkey" FOREIGN KEY ("inventoryCountId") REFERENCES "InventoryCount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCountItem" ADD CONSTRAINT "InventoryCountItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
