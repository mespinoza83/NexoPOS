import { Type } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, IsUrl, Length, MaxLength } from 'class-validator';

export class UpdateBusinessSettingsDto {
  @IsString() @Length(2, 150) legalName!: string;
  @IsOptional() @IsString() @MaxLength(150) commercialName?: string;
  @IsOptional() @IsString() @MaxLength(50) taxId?: string;
  @IsOptional() @IsString() @MaxLength(250) address?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsEmail() @MaxLength(150) email?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) @MaxLength(500) logoUrl?: string;
  @IsString() @Length(3, 3) defaultCurrency!: string;
  @IsString() @MaxLength(80) timezone!: string;
  @Type(() => Number) @IsIn([58, 80]) receiptPaperWidth!: number;
  @IsOptional() @IsString() @MaxLength(250) receiptMessage?: string;
}
