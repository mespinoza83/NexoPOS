-- CreateEnum
CREATE TYPE "InventoryEntryStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'VOIDED');

-- CreateTable
CREATE TABLE "InventoryEntry" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "reference" TEXT,
    "source" TEXT,
    "notes" TEXT,
    "status" "InventoryEntryStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),

    CONSTRAINT "InventoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryEntryItem" (
    "id" UUID NOT NULL,
    "inventoryEntryId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitCost" DECIMAL(14,2),
    "previousQuantity" DECIMAL(14,3) NOT NULL,
    "resultingQuantity" DECIMAL(14,3) NOT NULL,

    CONSTRAINT "InventoryEntryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryEntry_branchId_createdAt_idx" ON "InventoryEntry"("branchId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryEntry_branchId_number_key" ON "InventoryEntry"("branchId", "number");

-- CreateIndex
CREATE INDEX "InventoryEntryItem_productId_idx" ON "InventoryEntryItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryEntryItem_inventoryEntryId_productId_key" ON "InventoryEntryItem"("inventoryEntryId", "productId");

-- AddForeignKey
ALTER TABLE "InventoryEntry" ADD CONSTRAINT "InventoryEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEntryItem" ADD CONSTRAINT "InventoryEntryItem_inventoryEntryId_fkey" FOREIGN KEY ("inventoryEntryId") REFERENCES "InventoryEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEntryItem" ADD CONSTRAINT "InventoryEntryItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
