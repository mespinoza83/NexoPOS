ALTER TABLE "MeasurementUnit" ALTER COLUMN "code" TYPE TEXT USING "code"::text;
ALTER TABLE "Product" ALTER COLUMN "inventoryUnit" DROP DEFAULT;
ALTER TABLE "Product" ALTER COLUMN "saleUnit" DROP DEFAULT;
ALTER TABLE "Product" ALTER COLUMN "inventoryUnit" TYPE TEXT USING "inventoryUnit"::text;
ALTER TABLE "Product" ALTER COLUMN "saleUnit" TYPE TEXT USING "saleUnit"::text;
ALTER TABLE "Product" ALTER COLUMN "inventoryUnit" SET DEFAULT 'UNIT';
ALTER TABLE "Product" ALTER COLUMN "saleUnit" SET DEFAULT 'UNIT';
ALTER TABLE "InvoiceItem" ALTER COLUMN "saleUnit" DROP DEFAULT;
ALTER TABLE "InvoiceItem" ALTER COLUMN "saleUnit" TYPE TEXT USING "saleUnit"::text;
ALTER TABLE "InvoiceItem" ALTER COLUMN "saleUnit" SET DEFAULT 'UNIT';
DROP TYPE "UnitOfMeasure";
UPDATE "MeasurementUnit" SET "decimals" = LEAST("decimals", 2);

ALTER TABLE "BranchInventory" ALTER COLUMN "quantity" TYPE DECIMAL(14,2), ALTER COLUMN "minimumQuantity" TYPE DECIMAL(14,2);
ALTER TABLE "InventoryMovement" ALTER COLUMN "quantity" TYPE DECIMAL(14,2), ALTER COLUMN "previousQuantity" TYPE DECIMAL(14,2), ALTER COLUMN "resultingQuantity" TYPE DECIMAL(14,2);
ALTER TABLE "InventoryEntryItem" ALTER COLUMN "quantity" TYPE DECIMAL(14,2), ALTER COLUMN "previousQuantity" TYPE DECIMAL(14,2), ALTER COLUMN "resultingQuantity" TYPE DECIMAL(14,2);
ALTER TABLE "InventoryCountItem" ALTER COLUMN "expectedQuantity" TYPE DECIMAL(14,2), ALTER COLUMN "countedQuantity" TYPE DECIMAL(14,2), ALTER COLUMN "difference" TYPE DECIMAL(14,2);
ALTER TABLE "InvoiceItem" ALTER COLUMN "quantity" TYPE DECIMAL(14,2);
ALTER TABLE "ReturnItem" ALTER COLUMN "quantity" TYPE DECIMAL(14,2);
