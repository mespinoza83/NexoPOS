import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength, ValidateNested } from 'class-validator';

class ReturnItemDto {
  @IsUUID() invoiceItemId!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) quantity!: number;
}

class ReturnRefundDto {
  @IsUUID() paymentMethodId!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) amount!: number;
  @IsOptional() @IsUUID() bankId?: string;
  @IsOptional() @IsUUID() posTerminalId?: string;
  @IsOptional() @IsString() reference?: string;
}

export class CreateReturnDto {
  @IsString() @MinLength(3) reason!: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => ReturnItemDto) items!: ReturnItemDto[];
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => ReturnRefundDto) refunds!: ReturnRefundDto[];
}
