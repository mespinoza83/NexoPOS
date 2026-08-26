import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';
export class CloseCashSessionDto { @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) countedCash!: number; }
