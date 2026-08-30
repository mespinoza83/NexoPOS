import { IsBoolean, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { PaymentKind } from '@prisma/client';

export class UpdatePaymentMethodDto {
  @IsOptional() @IsString() @Length(2, 30) code?: string;
  @IsOptional() @IsString() @Length(2, 100) name?: string;
  @IsOptional() @IsEnum(PaymentKind) kind?: PaymentKind;
  @IsOptional() @IsBoolean() active?: boolean;
}
