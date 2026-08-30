import { IsBoolean, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class UpdateBranchDto {
  @IsOptional() @IsString() @Length(2, 20) code?: string;
  @IsOptional() @IsString() @Length(2, 150) name?: string;
  @IsOptional() @IsString() @MaxLength(250) address?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
