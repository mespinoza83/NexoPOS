import { ArrayNotEmpty, IsArray, IsEmail, IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(1) firstName!: string;
  @IsString() @MinLength(1) lastName!: string;
  @IsString() @MinLength(12) password!: string;
  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE', 'LOCKED']) status?: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  @IsArray() @ArrayNotEmpty() @IsUUID('4', { each: true }) roleIds!: string[];
  @IsArray() @ArrayNotEmpty() @IsUUID('4', { each: true }) branchIds!: string[];
}
