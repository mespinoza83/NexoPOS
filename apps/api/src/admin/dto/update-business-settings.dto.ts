import { Type } from 'class-transformer';
import { IsEmail, IsIn, IsNumber, IsOptional, IsString, Length, Matches, MaxLength, Min } from 'class-validator';

export class UpdateBusinessSettingsDto {
  @IsString() @Length(2, 150) legalName!: string;
  @IsOptional() @IsString() @MaxLength(150) commercialName?: string;
  @IsOptional() @IsString() @MaxLength(50) taxId?: string;
  @IsOptional() @IsString() @MaxLength(250) address?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsEmail() @MaxLength(150) email?: string;
  @IsOptional()
  @IsString()
  @MaxLength(750_000)
  @Matches(/^(https?:\/\/|data:image\/(?:png|jpeg|webp);base64,)/, { message: 'El logo debe ser una URL o una imagen PNG, JPG o WebP.' })
  logoUrl?: string;
  @IsString() @Length(3, 3) defaultCurrency!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 6 }) @Min(0.000001) exchangeRate!: number;
  @IsString() @MaxLength(80) timezone!: string;
  @Type(() => Number) @IsIn([58, 80]) receiptPaperWidth!: number;
  @IsOptional() @IsString() @MaxLength(250) receiptMessage?: string;
}
