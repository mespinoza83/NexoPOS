ALTER TABLE "Invoice" ADD COLUMN "idempotencyKey" UUID;

CREATE TABLE "SuspendedSale" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SuspendedSale_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Invoice_branchId_idempotencyKey_key" ON "Invoice"("branchId", "idempotencyKey");
CREATE INDEX "SuspendedSale_branchId_updatedAt_idx" ON "SuspendedSale"("branchId", "updatedAt");
CREATE INDEX "SuspendedSale_businessId_idx" ON "SuspendedSale"("businessId");
