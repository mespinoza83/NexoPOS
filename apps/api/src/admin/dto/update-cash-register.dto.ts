import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class UpdateCashRegisterDto {
  @IsOptional() @IsString() @Length(2, 30) code?: string;
  @IsOptional() @IsString() @Length(2, 100) name?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
