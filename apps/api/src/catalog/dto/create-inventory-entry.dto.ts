import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength, ValidateNested } from 'class-validator';

class InventoryEntryItemDto {
  @IsUUID() productId!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) quantity!: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) unitCost?: number;
}

export class CreateInventoryEntryDto {
  @IsUUID() branchId!: string;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() notes?: string;
  @IsString() @MinLength(3) reason!: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => InventoryEntryItemDto) items!: InventoryEntryItemDto[];
}
