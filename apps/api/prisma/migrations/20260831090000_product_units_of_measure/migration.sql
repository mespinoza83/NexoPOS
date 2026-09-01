CREATE TYPE "UnitOfMeasure" AS ENUM (
  'UNIT', 'GRAM', 'KILOGRAM', 'POUND', 'OUNCE', 'MILLILITER', 'LITER',
  'FLUID_OUNCE', 'METER', 'CENTIMETER', 'DOZEN', 'BOX', 'PACKAGE'
);

ALTER TABLE "Product"
  ADD COLUMN "inventoryUnit" "UnitOfMeasure" NOT NULL DEFAULT 'UNIT',
  ADD COLUMN "saleUnit" "UnitOfMeasure" NOT NULL DEFAULT 'UNIT',
  ADD COLUMN "saleUnitFactor" DECIMAL(14,6) NOT NULL DEFAULT 1,
  ADD COLUMN "allowFractionalSale" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "presentation" TEXT;

ALTER TABLE "InvoiceItem"
  ADD COLUMN "saleUnit" "UnitOfMeasure" NOT NULL DEFAULT 'UNIT',
  ADD COLUMN "saleUnitFactor" DECIMAL(14,6) NOT NULL DEFAULT 1;

ALTER TABLE "Product"
  ADD CONSTRAINT "Product_saleUnitFactor_check" CHECK ("saleUnitFactor" > 0);

ALTER TABLE "InvoiceItem"
  ADD CONSTRAINT "InvoiceItem_saleUnitFactor_check" CHECK ("saleUnitFactor" > 0);
