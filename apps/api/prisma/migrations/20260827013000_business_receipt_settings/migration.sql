ALTER TABLE "Business"
ADD COLUMN "commercialName" TEXT,
ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/Managua',
ADD COLUMN "receiptPaperWidth" INTEGER NOT NULL DEFAULT 80;
