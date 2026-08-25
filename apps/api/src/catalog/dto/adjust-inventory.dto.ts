import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class AdjustInventoryDto {
  @IsUUID() branchId!: string;
  @IsIn(['ADJUSTMENT_IN', 'ADJUSTMENT_OUT']) type!: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) quantity!: number;
  @IsString() @MinLength(3) reason!: string;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) minimumQuantity?: number;
}
