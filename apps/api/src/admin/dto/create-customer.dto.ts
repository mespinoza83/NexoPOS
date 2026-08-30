import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateCustomerDto {
  @IsString() @Length(2, 150) name!: string;
  @IsOptional() @IsString() @MaxLength(50) taxId?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsEmail() @MaxLength(150) email?: string;
}
