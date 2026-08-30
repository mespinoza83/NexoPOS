import { IsEnum, IsString, Length } from 'class-validator';
import { PaymentKind } from '@prisma/client';

export class CreatePaymentMethodDto {
  @IsString() @Length(2, 30) code!: string;
  @IsString() @Length(2, 100) name!: string;
  @IsEnum(PaymentKind) kind!: PaymentKind;
}
