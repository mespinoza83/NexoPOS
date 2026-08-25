import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, IsUrl, IsUUID, Max, Min, MinLength } from 'class-validator';

export class CreateProductDto {
  @IsString() @MinLength(1) internalCode!: string;
  @IsOptional() @IsString() barcode?: string;
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsUUID() categoryId!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) purchasePrice!: number;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(999.99) profitMargin!: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) salePrice?: number;
  @IsOptional() @IsBoolean() manualSalePrice?: boolean;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) initialQuantity!: number;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) minimumQuantity!: number;
  @IsOptional() @IsBoolean() availableForSale?: boolean;
  @IsOptional() @IsBoolean() taxExempt?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100) taxRate?: number;
  @IsOptional() @IsUrl({ require_tld: false }) imageUrl?: string;
  @IsUUID() branchId!: string;
}
