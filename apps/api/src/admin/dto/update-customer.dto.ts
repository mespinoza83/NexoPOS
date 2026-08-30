import { IsBoolean, IsEmail, IsOptional, IsString, Length, MaxLength, ValidateIf } from 'class-validator';

export class UpdateCustomerDto {
  @IsOptional() @IsString() @Length(2, 150) name?: string;
  @IsOptional() @IsString() @MaxLength(50) taxId?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @ValidateIf((_, value) => value !== '') @IsEmail() @MaxLength(150) email?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
