CREATE TABLE "MeasurementUnit" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "code" "UnitOfMeasure" NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL DEFAULT 3,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MeasurementUnit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MeasurementUnit_businessId_code_key" ON "MeasurementUnit"("businessId", "code");
CREATE INDEX "MeasurementUnit_businessId_active_idx" ON "MeasurementUnit"("businessId", "active");
ALTER TABLE "MeasurementUnit" ADD CONSTRAINT "MeasurementUnit_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "MeasurementUnit" ("id", "businessId", "code", "name", "abbreviation", "decimals", "updatedAt")
SELECT gen_random_uuid(), b."id", u.code::"UnitOfMeasure", u.name, u.abbreviation, u.decimals, CURRENT_TIMESTAMP
FROM "Business" b CROSS JOIN (VALUES
 ('UNIT','Unidad','unid.',0), ('GRAM','Gramo','g',3), ('KILOGRAM','Kilogramo','kg',3),
 ('POUND','Libra','lb',3), ('OUNCE','Onza','oz',3), ('MILLILITER','Mililitro','ml',3),
 ('LITER','Litro','L',3), ('FLUID_OUNCE','Onza líquida','fl oz',3), ('METER','Metro','m',3),
 ('CENTIMETER','Centímetro','cm',3), ('DOZEN','Docena','doc.',3), ('BOX','Caja','caja',0), ('PACKAGE','Paquete','paq.',0)
) AS u(code, name, abbreviation, decimals);
