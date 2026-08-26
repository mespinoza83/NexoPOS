import { Type } from 'class-transformer';
import { CashMovementType } from '@prisma/client';
import { IsEnum, IsNumber, IsString, Min, MinLength } from 'class-validator';
export class CreateCashMovementDto { @IsEnum(CashMovementType) type!: CashMovementType; @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) amount!: number; @IsString() @MinLength(3) reason!: string; }
