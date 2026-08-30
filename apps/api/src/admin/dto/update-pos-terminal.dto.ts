import { IsBoolean, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class UpdatePosTerminalDto {
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsUUID() bankId?: string;
  @IsOptional() @IsString() @Length(2, 30) code?: string;
  @IsOptional() @IsString() @Length(2, 150) name?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
