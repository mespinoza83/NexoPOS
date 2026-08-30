import { ArrayNotEmpty, IsArray, IsEmail, IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MinLength(1) firstName?: string;
  @IsOptional() @IsString() @MinLength(1) lastName?: string;
  @IsOptional() @IsString() @MinLength(12) password?: string;
  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE', 'LOCKED']) status?: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  @IsOptional() @IsUUID() roleId?: string;
  @IsOptional() @IsArray() @ArrayNotEmpty() @IsUUID('4', { each: true }) branchIds?: string[];
}
