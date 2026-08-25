import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength, ValidateNested } from 'class-validator';

class InventoryCountItemDto {
  @IsUUID() productId!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) countedQuantity!: number;
}

export class CreateInventoryCountDto {
  @IsUUID() branchId!: string;
  @IsString() @MinLength(3) reason!: string;
  @IsOptional() @IsString() notes?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => InventoryCountItemDto) items!: InventoryCountItemDto[];
}
