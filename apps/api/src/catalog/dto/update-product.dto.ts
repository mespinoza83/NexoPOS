import { Type } from 'class-transformer';
import { ProductStatus, UnitOfMeasure } from '@prisma/client';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUrl, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateProductDto {
  @IsOptional() @IsString() @MinLength(1) internalCode?: string;
  @IsOptional() @IsString() barcode?: string | null;
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) purchasePrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(999.99) profitMargin?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) salePrice?: number;
  @IsOptional() @IsBoolean() manualSalePrice?: boolean;
  @IsOptional() @IsBoolean() availableForSale?: boolean;
  @IsOptional() @IsEnum(UnitOfMeasure) inventoryUnit?: UnitOfMeasure;
  @IsOptional() @IsEnum(UnitOfMeasure) saleUnit?: UnitOfMeasure;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 6 }) @Min(0.000001) saleUnitFactor?: number;
  @IsOptional() @IsBoolean() allowFractionalSale?: boolean;
  @IsOptional() @IsString() @MaxLength(80) presentation?: string | null;
  @IsOptional() @IsBoolean() taxExempt?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) taxRate?: number;
  @IsOptional() @IsUrl({ require_tld: false }) imageUrl?: string | null;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) minimumQuantity?: number;
  @IsOptional() @IsUUID() branchId?: string;
}
