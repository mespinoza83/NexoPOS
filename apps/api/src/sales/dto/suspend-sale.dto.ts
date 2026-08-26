import { IsObject, IsString, IsUUID, MinLength } from 'class-validator';
export class SuspendSaleDto { @IsUUID() branchId!: string; @IsString() @MinLength(2) label!: string; @IsObject() data!: Record<string, unknown>; }
